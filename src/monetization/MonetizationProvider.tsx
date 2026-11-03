import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesPackage,
} from "@revenuecat/purchases-typescript-internal";
import {
  ActionExecutionLock,
  runAfterOptionalAd,
  shouldShowAd,
  type MonetizedAction,
} from "./monetizationPolicy";
import {
  supportsNativeMonetization,
  usesTestMonetization,
} from "./monetizationConfig";

const AD_FREE_ENTITLEMENT = "ad_free";
const REMOVE_ADS_PRODUCT = "remove_ads_lifetime";
const AD_FREE_CACHE_KEY = "@jnbot/monetization/ad-free-v1";
const LAST_AD_AT_KEY = "@jnbot/monetization/last-ad-at-v1";
const HAS_SEEN_AD_KEY = "@jnbot/monetization/has-seen-ad-v1";

type PurchaseResult = "purchased" | "cancelled";

type MonetizationContextValue = {
  ready: boolean;
  isAdFree: boolean;
  purchasesConfigured: boolean;
  purchaseAvailable: boolean;
  hasSeenAd: boolean;
  purchasing: boolean;
  removeAdsPrice: string | null;
  privacyOptionsRequired: boolean;
  executeWithMonetization: <T>(
    kind: MonetizedAction,
    action: () => Promise<T>,
  ) => Promise<T>;
  purchaseRemoveAds: () => Promise<PurchaseResult>;
  restorePurchases: () => Promise<boolean>;
  openPrivacyChoices: () => Promise<boolean>;
};

const MonetizationContext = createContext<MonetizationContextValue | null>(
  null,
);

const nativePurchases = () =>
  require("react-native-purchases") as typeof import("react-native-purchases");

const revenueCatKey = () => {
  if (!supportsNativeMonetization(Platform.OS)) return undefined;

  if (usesTestMonetization(process.env.EXPO_PUBLIC_MONETIZATION_ENV)) {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY;
  }

  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
};

const productionInterstitialId = () =>
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID;

const hasAdFreeEntitlement = (info: CustomerInfo) =>
  Boolean(info.entitlements.active[AD_FREE_ENTITLEMENT]);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const wasPurchaseCancelled = (error: unknown) =>
  Boolean(
    error &&
    typeof error === "object" &&
    "userCancelled" in error &&
    error.userCancelled,
  );

export function MonetizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [isAdFree, setIsAdFree] = useState(false);
  const [purchasesConfigured, setPurchasesConfigured] = useState(false);
  const [purchaseAvailable, setPurchaseAvailable] = useState(false);
  const [hasSeenAd, setHasSeenAd] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [removeAdsPrice, setRemoveAdsPrice] = useState<string | null>(null);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);

  const mountedRef = useRef(true);
  const isAdFreeRef = useRef(false);
  const historyReadyRef = useRef(false);
  const consentAllowsAdsRef = useRef(false);
  const lastShownAtRef = useRef<number | null>(null);
  const interstitialRef = useRef<
    import("react-native-google-mobile-ads").InterstitialAd | null
  >(null);
  const adLoadedRef = useRef(false);
  const executionLockRef = useRef(new ActionExecutionLock());
  const purchasePackageRef = useRef<PurchasesPackage | null>(null);

  const refreshPurchasesRef = useRef<() => Promise<void>>(
    async () => undefined,
  );

  const applyCustomerInfo = useCallback(async (info: CustomerInfo) => {
    const active = hasAdFreeEntitlement(info);
    isAdFreeRef.current = active;
    if (mountedRef.current) setIsAdFree(active);
    try {
      if (active) await AsyncStorage.setItem(AD_FREE_CACHE_KEY, "1");
      else await AsyncStorage.removeItem(AD_FREE_CACHE_KEY);
    } catch (error) {
      console.warn(
        "[Monetization] Entitlement cache update failed",
        errorMessage(error, "Unknown storage error"),
      );
    }
  }, []);

  const loadOffering = useCallback(async () => {
    const { default: Purchases } = nativePurchases();
    const offerings = await Purchases.getOfferings();
    const candidates = offerings.current
      ? offerings.current.availablePackages
      : Object.values(offerings.all).flatMap(
        (offering) => offering.availablePackages,
      );
    const removeAds = candidates.find(
      (item) => item.product.identifier === REMOVE_ADS_PRODUCT,
    );
    purchasePackageRef.current = removeAds ?? null;
    if (mountedRef.current) {
      setPurchaseAvailable(Boolean(removeAds));
      setRemoveAdsPrice(removeAds?.product.priceString ?? null);
    }
  }, []);

  const initializePurchases = useCallback(async () => {
    const apiKey = revenueCatKey();
    if (!apiKey) return;

    try {
      const { default: Purchases, LOG_LEVEL } = nativePurchases();
      if (!(await Purchases.isConfigured())) {
        Purchases.setLogHandler((logLevel, message) => {
          if (message.includes("ui_config")) {
            return;
          }
          switch (logLevel) {
            case LOG_LEVEL.DEBUG:
            case LOG_LEVEL.VERBOSE:
              console.debug(`[RevenueCat] ${message}`);
              break;
            case LOG_LEVEL.INFO:
              console.info(`[RevenueCat] ${message}`);
              break;
            case LOG_LEVEL.WARN:
              console.warn(`[RevenueCat] ${message}`);
              break;
            case LOG_LEVEL.ERROR:
              console.error(`[RevenueCat] ${message}`);
              break;
            default:
              console.log(`[RevenueCat] ${message}`);
          }
        });
        Purchases.configure({
          apiKey,
          automaticDeviceIdentifierCollectionEnabled: false,
        });
      }
      if (mountedRef.current) setPurchasesConfigured(true);
      await applyCustomerInfo(await Purchases.getCustomerInfo());
      await loadOffering();
    } catch (error) {
      console.warn(
        "[Monetization] RevenueCat initialization failed",
        errorMessage(error, "Unknown purchase error"),
      );
    }
  }, [applyCustomerInfo, loadOffering]);

  const prepareInterstitial = useCallback(
    (ads: typeof import("react-native-google-mobile-ads")) => {
      const adUnitId = usesTestMonetization(
        process.env.EXPO_PUBLIC_MONETIZATION_ENV,
      )
        ? ads.TestIds.INTERSTITIAL
        : productionInterstitialId();
      if (!adUnitId) return;

      interstitialRef.current?.removeAllListeners();
      const interstitial = ads.InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      interstitialRef.current = interstitial;
      adLoadedRef.current = false;
      interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
        adLoadedRef.current = true;
      });
      interstitial.addAdEventListener(ads.AdEventType.OPENED, () => {
        const shownAt = Date.now();
        lastShownAtRef.current = shownAt;
        if (mountedRef.current) setHasSeenAd(true);
        void AsyncStorage.setItem(HAS_SEEN_AD_KEY, "1").catch((error) =>
          console.warn(
            "[Monetization] Ad history update failed",
            errorMessage(error, "Unknown storage error"),
          ),
        );
        void AsyncStorage.setItem(LAST_AD_AT_KEY, String(shownAt)).catch(
          (error) =>
            console.warn(
              "[Monetization] Impression cache update failed",
              errorMessage(error, "Unknown storage error"),
            ),
        );
      });
      interstitial.addAdEventListener(ads.AdEventType.ERROR, () => {
        adLoadedRef.current = false;
      });
      interstitial.load();
    },
    [],
  );

  const initializeAds = useCallback(async () => {
    if (!supportsNativeMonetization(Platform.OS)) return;
    try {
      const ads =
        require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
      const consent = await ads.AdsConsent.gatherConsent();
      if (mountedRef.current) {
        setPrivacyOptionsRequired(
          consent.privacyOptionsRequirementStatus ===
          ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        );
      }
      consentAllowsAdsRef.current = consent.canRequestAds;
      if (!consent.canRequestAds || isAdFreeRef.current) return;

      await ads.default().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.PG,
      });
      await ads.default().initialize();
      prepareInterstitial(ads);
    } catch (error) {
      consentAllowsAdsRef.current = false;
      console.warn(
        "[Monetization] Ad initialization failed",
        errorMessage(error, "Unknown ad error"),
      );
    }
  }, [prepareInterstitial]);

  useEffect(() => {
    mountedRef.current = true;
    let customerInfoListener: CustomerInfoUpdateListener | null = null;

    const initialize = async () => {
      try {
        const [cachedAdFreeResult, lastShownAtResult, hasSeenAdResult] =
          await Promise.allSettled([
            AsyncStorage.getItem(AD_FREE_CACHE_KEY),
            AsyncStorage.getItem(LAST_AD_AT_KEY),
            AsyncStorage.getItem(HAS_SEEN_AD_KEY),
          ]);
        const cachedAdFree =
          cachedAdFreeResult.status === "fulfilled"
            ? cachedAdFreeResult.value
            : null;
        const lastShownAt =
          lastShownAtResult.status === "fulfilled"
            ? lastShownAtResult.value
            : null;
        const cachedHasSeenAd =
          hasSeenAdResult.status === "fulfilled" &&
          hasSeenAdResult.value === "1";
        const cachedActive = cachedAdFree === "1";
        const parsedLastShownAt = Number(lastShownAt);
        isAdFreeRef.current = cachedActive;
        lastShownAtRef.current =
          lastShownAt && Number.isFinite(parsedLastShownAt)
            ? parsedLastShownAt
            : null;
        historyReadyRef.current = true;
        if (mountedRef.current) setIsAdFree(cachedActive);
        if (mountedRef.current) setHasSeenAd(cachedHasSeenAd);

        await Promise.all([
          initializePurchases(),
          cachedActive ? Promise.resolve() : initializeAds(),
        ]);

        if (!mountedRef.current) return;
        if (revenueCatKey()) {
          const { default: Purchases } = nativePurchases();
          customerInfoListener = (info) => void applyCustomerInfo(info);
          Purchases.addCustomerInfoUpdateListener(customerInfoListener);
          refreshPurchasesRef.current = async () => {
            try {
              const { default: Purchases } = nativePurchases();
              await applyCustomerInfo(await Purchases.getCustomerInfo());
              await loadOffering();
            } catch (error) {
              console.warn(
                "[Monetization] Purchase refresh failed",
                errorMessage(error, "Unknown purchase error"),
              );
            }
          };
        }

      } catch (error) {
        console.warn(
          "[Monetization] Initialization failed",
          errorMessage(error, "Unknown initialization error"),
        );
      } finally {
        if (mountedRef.current) setReady(true);
      }
    };

    void initialize();
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") void refreshPurchasesRef.current();
      },
    );

    return () => {
      mountedRef.current = false;
      appStateSubscription.remove();
      interstitialRef.current?.removeAllListeners();
      if (customerInfoListener) {
        const { default: Purchases } = nativePurchases();
        Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
      }
    };
  }, [applyCustomerInfo, initializeAds, initializePurchases, loadOffering]);

  const showPreparedAd = useCallback(async () => {
    const ad = interstitialRef.current;
    if (!ad || !adLoadedRef.current) return;

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        adLoadedRef.current = false;
        unsubscribeClosed();
        unsubscribeError();
        try {
          ad.load();
        } catch {
          // A failed reload should not block the requested action.
        }
        resolve();
      };
      const ads =
        require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
      const unsubscribeClosed = ad.addAdEventListener(
        ads.AdEventType.CLOSED,
        finish,
      );
      const unsubscribeError = ad.addAdEventListener(
        ads.AdEventType.ERROR,
        finish,
      );
      try {
        void ad.show().catch(finish);
      } catch {
        finish();
      }
    });
  }, []);

  const executeWithMonetization = useCallback(
    <T,>(_kind: MonetizedAction, action: () => Promise<T>): Promise<T> => {
      return executionLockRef.current.run(async () => {
        const present = shouldShowAd(
          {
            isAdFree: isAdFreeRef.current,
            consentAllowsAds: consentAllowsAdsRef.current,
            adLoaded: adLoadedRef.current,
            gateRunning: false,
            historyReady: historyReadyRef.current,
            lastShownAt: lastShownAtRef.current,
          },
          Date.now(),
        );
        return runAfterOptionalAd(present, showPreparedAd, action);
      });
    },
    [showPreparedAd],
  );

  const purchaseRemoveAds = useCallback(async (): Promise<PurchaseResult> => {
    if (!supportsNativeMonetization(Platform.OS))
      throw new Error("Purchases are not available on iOS.");

    const packageToBuy = purchasePackageRef.current;
    if (!packageToBuy)
      throw new Error(
        "The ad-free purchase is not available in this build yet.",
      );

    setPurchasing(true);
    try {
      const { default: Purchases } = nativePurchases();
      const result = await Purchases.purchasePackage(packageToBuy);
      await applyCustomerInfo(result.customerInfo);
      return "purchased";
    } catch (error) {
      if (wasPurchaseCancelled(error)) return "cancelled";
      throw new Error(
        errorMessage(error, "The purchase could not be completed."),
      );
    } finally {
      if (mountedRef.current) setPurchasing(false);
    }
  }, [applyCustomerInfo]);

  const restorePurchases = useCallback(async () => {
    if (!supportsNativeMonetization(Platform.OS))
      throw new Error("Purchases are not available on iOS.");
    if (!purchasesConfigured)
      throw new Error("Purchases are not configured in this build yet.");

    setPurchasing(true);
    try {
      const { default: Purchases } = nativePurchases();
      const info = await Purchases.restorePurchases();
      await applyCustomerInfo(info);
      return hasAdFreeEntitlement(info);
    } catch (error) {
      throw new Error(errorMessage(error, "Purchases could not be restored."));
    } finally {
      if (mountedRef.current) setPurchasing(false);
    }
  }, [applyCustomerInfo, purchasesConfigured]);

  const openPrivacyChoices = useCallback(async () => {
    if (!supportsNativeMonetization(Platform.OS)) return false;
    try {
      const ads =
        require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
      const info = await ads.AdsConsent.getConsentInfo();
      const required =
        info.privacyOptionsRequirementStatus ===
        ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
      if (!required) return false;
      const updated = await ads.AdsConsent.showPrivacyOptionsForm();
      consentAllowsAdsRef.current = updated.canRequestAds;
      return true;
    } catch (error) {
      throw new Error(
        errorMessage(error, "Privacy choices could not be opened."),
      );
    }
  }, []);

  const value = useMemo<MonetizationContextValue>(
    () => ({
      ready,
      isAdFree,
      purchasesConfigured,
      purchaseAvailable,
      hasSeenAd,
      purchasing,
      removeAdsPrice,
      privacyOptionsRequired,
      executeWithMonetization,
      purchaseRemoveAds,
      restorePurchases,
      openPrivacyChoices,
    }),
    [
      executeWithMonetization,
      hasSeenAd,
      isAdFree,
      openPrivacyChoices,
      privacyOptionsRequired,
      purchaseAvailable,
      purchaseRemoveAds,
      purchasesConfigured,
      purchasing,
      ready,
      removeAdsPrice,
      restorePurchases,
    ],
  );

  return (
    <MonetizationContext.Provider value={value}>
      {children}
    </MonetizationContext.Provider>
  );
}

export function useMonetization() {
  const context = useContext(MonetizationContext);
  if (!context)
    throw new Error(
      "useMonetization must be used inside MonetizationProvider.",
    );
  return context;
}
