type NavigationRouter = {
  back: () => void;
  push: (href: string) => void;
};

export const navigateBackOrPush = (
  router: NavigationRouter,
  fallbackHref = "/",
): void => {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallbackHref);
};
