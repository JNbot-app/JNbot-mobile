import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { assertAndroidPageSize } from './android-page-size.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gradlePath = path.join(root, 'node_modules', 'nodejs-mobile-react-native', 'android', 'build.gradle');
const javaPath = path.join(root, 'node_modules', 'nodejs-mobile-react-native', 'android', 'src', 'main', 'java', 'com', 'janeasystems', 'rn_nodejs_mobile', 'RNNodeJsMobileModule.java');
const cmakePath = path.join(root, 'node_modules', 'nodejs-mobile-react-native', 'android', 'CMakeLists.txt');

export function patchNodejsMobile() {
  let patchedAny = false;

  const dependencyRoot = path.join(root, 'node_modules', 'nodejs-mobile-react-native');
  if (fs.existsSync(dependencyRoot)) {
    const vendorRoot = path.join(root, 'vendor', 'nodejs-mobile-android');
    const manifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, 'manifest.json'), 'utf8'));
    const dependency = JSON.parse(fs.readFileSync(path.join(dependencyRoot, 'package.json'), 'utf8'));
    if (dependency.version !== manifest.packageVersion) {
      throw new Error('Node.js Mobile version changed; rebuild and verify the vendored Android runtime.');
    }
    for (const abi of ['arm64-v8a', 'x86_64']) {
      const library = manifest.libraries[abi];
      const bytes = gunzipSync(fs.readFileSync(path.join(vendorRoot, library.file)));
      if (createHash('sha256').update(bytes).digest('hex') !== library.sha256) {
        throw new Error(`Vendored ${abi} Node library checksum mismatch.`);
      }
      assertAndroidPageSize(bytes, `${abi}/libnode.so`);
      const destination = path.join(dependencyRoot, 'android', 'libnode', 'bin', abi, 'libnode.so');
      if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(bytes)) {
        // Replace rather than overwrite: npm may have hard-linked its package cache.
        fs.rmSync(destination, { force: true });
        fs.writeFileSync(destination, bytes);
        patchedAny = true;
      }
    }
  }

  // The prebuilt Node library must be replaced separately. These flags align
  // the bridge compiled by Gradle, including builds using the project's NDK 27.
  if (fs.existsSync(cmakePath)) {
    const cmake = fs.readFileSync(cmakePath, 'utf8');
    if (!cmake.includes('max-page-size=16384')) {
      fs.appendFileSync(cmakePath, '\nset_property(TARGET nodejs-mobile-react-native-native-lib APPEND_STRING PROPERTY LINK_FLAGS " -Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384")\n');
      patchedAny = true;
    }
  }

  // 1. Patch Gradle to rename .gz to .gz.dat so AAPT does not strip or corrupt .gz assets
  if (fs.existsSync(gradlePath)) {
    let gradle = fs.readFileSync(gradlePath, 'utf8');
    const oldTaskRegex = /task CopyNodeProjectAssetsFolder\s*\(type:\s*Sync\)\s*\{[\s\S]*?into "\$\{rootProject\.buildDir\}\/nodejs-assets\/nodejs-project\/"\s*\}/;
    const newTask = `task CopyNodeProjectAssetsFolder (type:Sync) {
    description "Copies the Node Project to a build folder for manipulation."
    from ("\${rootProject.projectDir}/../nodejs-assets/nodejs-project") {
        exclude '**/*~' // temporary files
        exclude '**/.*' // files and dirs starting with .
        eachFile { details ->
            if (details.name.endsWith('.gz')) {
                details.name = details.name + '.dat'
            }
        }
    }
    into "\${rootProject.buildDir}/nodejs-assets/nodejs-project/"
}`;
    if (!gradle.includes("details.name = details.name + '.dat'")) {
      if (oldTaskRegex.test(gradle)) {
        gradle = gradle.replace(oldTaskRegex, newTask);
        fs.writeFileSync(gradlePath, gradle, 'utf8');
        console.log('Patched nodejs-mobile-react-native/android/build.gradle with .gz.dat asset renaming.');
        patchedAny = true;
      }
    }
  }

  // 2. Patch Java RNNodeJsMobileModule to restore destination filenames from .gz.dat to .gz
  if (fs.existsSync(javaPath)) {
    let java = fs.readFileSync(javaPath, 'utf8');
    if (!java.includes('destFile.endsWith(".gz.dat")')) {
      const oldNativeCopy = `String dest = nodeJsProjectPath + "/" + file;
        copyAsset(src, dest);`;
      const newNativeCopy = `String destFile = file;
        if (destFile.endsWith(".gz.dat")) {
          destFile = destFile.substring(0, destFile.length() - 4);
        }
        String dest = nodeJsProjectPath + "/" + destFile;
        copyAsset(src, dest);`;

      const oldMainCopy = `String dest = filesDirPath + "/" + file;
        copyAsset(src, dest);`;
      const newMainCopy = `String destFile = file;
        if (destFile.endsWith(".gz.dat")) {
          destFile = destFile.substring(0, destFile.length() - 4);
        }
        String dest = filesDirPath + "/" + destFile;
        copyAsset(src, dest);`;

      const oldFolderCopy = `copyAsset(fromAssetPath, toPath);`;
      const newFolderCopy = `String destPath = toPath;
      if (destPath.endsWith(".gz.dat")) {
        destPath = destPath.substring(0, destPath.length() - 4);
      }
      copyAsset(fromAssetPath, destPath);`;

      if (java.includes(oldNativeCopy)) java = java.replace(oldNativeCopy, newNativeCopy);
      if (java.includes(oldMainCopy)) java = java.replace(oldMainCopy, newMainCopy);
      if (java.includes(oldFolderCopy)) java = java.replace(oldFolderCopy, newFolderCopy);

      fs.writeFileSync(javaPath, java, 'utf8');
      console.log('Patched RNNodeJsMobileModule.java to unpack .gz.dat assets.');
      patchedAny = true;
    }
  }

  return patchedAny;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchNodejsMobile();
}
