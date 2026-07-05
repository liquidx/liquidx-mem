// Chrome Extension API utilities

export const getCurrentTabUrl = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const tab = tabs[0];
      if (tab?.url) {
        resolve(tab.url);
      } else {
        reject(new Error("Unable to get current tab URL"));
      }
    });
  });
};

export const getStoredSecret = (): Promise<string | null> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["secret"], (result) => {
      resolve(result.secret || null);
    });
  });
};

export const saveSecret = (secret: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ secret }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
};

export const getUserId = async (secret: string): Promise<string> => {
  const payload = {
    secret,
  };

  const response = await fetch("https://mem.liquidx.net/_api/mem/user/get", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }

  return result.userId;
};

export interface TagSuggestion {
  tag: string;
  count: number;
  icon?: string;
}

export interface HashtagMatch {
  fullMatch: string;
  partial: string;
  startIndex: number;
  endIndex: number;
}

export const findCurrentHashtag = (text: string, cursorPosition: number): HashtagMatch | null => {
  // Find hashtags in the text using regex
  const hashtagRegex = /#[\w]*/g;
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;
    
    // Check if cursor is within this hashtag
    if (cursorPosition >= startIndex && cursorPosition <= endIndex) {
      return {
        fullMatch: match[0],
        partial: match[0].slice(1), // Remove the # symbol
        startIndex,
        endIndex
      };
    }
  }
  
  return null;
};

export const getTagSuggestions = async (
  userId: string,
  query: string,
  secret: string
): Promise<TagSuggestion[]> => {
  const url = new URL("https://mem.liquidx.net/_api/tag/suggest");
  url.searchParams.set("userId", userId);
  url.searchParams.set("query", query);
  url.searchParams.set("secret", secret);
  url.searchParams.set("limit", "10");

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }

  return result.suggestions || [];
};

export const saveToMem = async (
  text: string,
  secret: string
): Promise<void> => {
  const payload = {
    text,
    secret,
  };

  const response = await fetch("https://mem.liquidx.net/_api/mem/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  // Check if response is JSON and has error
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
  }
};
