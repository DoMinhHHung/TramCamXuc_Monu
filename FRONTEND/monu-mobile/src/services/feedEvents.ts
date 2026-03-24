type FeedListener = () => void;

const listeners = new Set<FeedListener>();

export const subscribeFeedUpdates = (listener: FeedListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifyFeedUpdated = (): void => {
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // ignore listener errors to keep publisher safe
    }
  });
};

