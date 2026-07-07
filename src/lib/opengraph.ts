import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import he from "he";
import iconv from "iconv-lite";

export interface OpenGraphImage {
  url: string;
  width?: string;
  height?: string;
  type?: string;
  alt?: string;
}

export interface OpenGraphVideo {
  url: string;
  width?: string;
  height?: string;
  type?: string;
}

export interface OpenGraphAudio {
  url: string;
  type?: string;
}

export interface OpenGraphTags {
  site_name?: string;
  title?: string;
  type?: string;
  locale?: string;
  description?: string;
  url?: string;
  oldDescription?: string;
  oldTitle?: string;
  images?: OpenGraphImage[];
  videos?: OpenGraphVideo[];
  audios?: OpenGraphAudio[];
}

// https://stackoverflow.com/questions/62526483/twitter-website-doesnt-have-open-graph-tags
const DISCORD_BOT_USER_AGENT = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

export const parseOpenGraph = (content: string): OpenGraphTags => {
  const ogRegex = /<meta\s+[^>]*?\s?(content|property)="([^"]*)"\s+(content|property)="([^"]*)"/g;
  const ogTags: OpenGraphTags = {};

  const images = [];
  const videos = [];
  const audios = [];

  let currentImage: OpenGraphImage | null = null;
  let currentVideo: OpenGraphVideo | null = null;
  let currentAudio: OpenGraphAudio | null = null;

  const matches = content.matchAll(ogRegex);
  for (const match of matches) {
    let propertyKey = "";
    let propertyValue = "";

    // Figure out which group is the property and which is the content
    if (match[1] === "property") {
      propertyKey = match[2];
      propertyValue = he.decode(match[4]);
    } else if (match[3] === "property") {
      propertyKey = match[4];
      propertyValue = he.decode(match[2]);
    } else {
      console.log(match.groups);
    }

    if (propertyKey.startsWith("og:")) {
      propertyKey = propertyKey.replace("og:", "");
    } else {
      continue;
    }

    // Handle the content from the images.
    if (propertyKey.startsWith("image") && propertyValue.trim().length > 0) {
      if (propertyKey === "image" || propertyKey === "image:url") {
        if (currentImage) {
          images.push(currentImage);
        }
        currentImage = { url: propertyValue };
      } else if (propertyKey === "image:width" && currentImage) {
        currentImage.width = propertyValue;
      } else if (propertyKey === "image:height" && currentImage) {
        currentImage.height = propertyValue;
      } else if (propertyKey === "image:type" && currentImage) {
        currentImage.type = propertyValue;
      } else if (propertyKey === "image:alt" && currentImage) {
        currentImage.alt = propertyValue;
      }
    } else if (propertyKey.startsWith("video") && propertyValue.trim().length > 0) {
      if (propertyKey === "video" || propertyKey === "video:url") {
        if (currentVideo) {
          videos.push(currentVideo);
        }
        currentVideo = { url: propertyValue };
      } else if (propertyKey === "video:width" && currentVideo) {
        currentVideo.width = propertyValue;
      } else if (propertyKey === "video:height" && currentVideo) {
        currentVideo.height = propertyValue;
      } else if (propertyKey === "video:type" && currentVideo) {
        currentVideo.type = propertyValue;
      }
    } else if (propertyKey.startsWith("audio") && propertyValue.trim().length > 0) {
      if (propertyKey === "audio") {
        if (currentAudio) {
          audios.push(currentAudio);
        }
        currentAudio = { url: propertyValue };
      } else if (propertyKey === "audio:type" && currentAudio) {
        currentAudio.type = propertyValue;
      }
    } else if (propertyValue.trim().length > 0) {
      ogTags[propertyKey] = propertyValue;
    }
  }

  // Add any remaining images
  if (currentImage) {
    images.push(currentImage);
  }
  if (currentVideo) {
    videos.push(currentVideo);
  }
  if (currentAudio) {
    audios.push(currentAudio);
  }

  if (images.length > 0) {
    ogTags.images = images;
  }
  if (videos.length > 0) {
    ogTags.videos = videos;
  }
  if (audios.length > 0) {
    ogTags.audios = audios;
  }

  // Extract any old school meta tags
  const metaDescription = content.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  if (metaDescription) {
    ogTags.oldDescription = he.decode(metaDescription[1]);
  }

  const metaTitle = content.match(/<title>([^<]*)<\/title>/);
  if (metaTitle) {
    ogTags.oldTitle = he.decode(metaTitle[1]);
  }

  return ogTags;
};

// Determine the charset of an HTML response body. Precedence follows a
// simplified version of the WHATWG encoding sniffing algorithm: an explicit
// charset in the HTTP Content-Type header wins, otherwise we fall back to the
// <meta> charset declaration inside the HTML itself. Many Japanese sites
// (e.g. itmedia.co.jp) serve Shift_JIS content but only send
// `Content-Type: text/html` with no charset, relying on the meta tag to
// announce the encoding. Without the meta fallback the bytes get decoded as
// UTF-8 and turn into mojibake.
export const detectCharset = (data: Buffer, contentType?: string): string => {
  const contentCharsetPattern = /charset=([^;]*)/i;

  const fromHeader = contentType?.match(contentCharsetPattern);
  if (fromHeader && fromHeader[1].trim().length > 0) {
    return fromHeader[1].trim().toLowerCase();
  }

  // Meta charset declarations are always ASCII, so we can decode the first
  // chunk as latin1 to scan for them without knowing the encoding yet. This
  // matches both the HTML5 form (<meta charset="shift_jis">) and the legacy
  // http-equiv form (<meta http-equiv="Content-Type"
  // content="text/html; charset=Shift_JIS">).
  const head = data.subarray(0, 4096).toString("latin1");
  const fromMeta = head.match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i);
  if (fromMeta) {
    return fromMeta[1].trim().toLowerCase();
  }

  return "utf-8";
};

// Detects the charset of the content-type (header or HTML meta tag), and if it
// is not UTF-8, transcodes the body to UTF-8.
const transcodeResponse = (response: AxiosResponse): AxiosResponse => {
  const charset = detectCharset(response.data, response.headers["content-type"]);

  if (charset === "utf-8" || charset === "utf8") {
    // toString() decodes as UTF-8 by default, so leave the buffer as-is.
    return response;
  }

  if (!iconv.encodingExists(charset)) {
    console.warn("Unknown charset, decoding as UTF-8:", charset);
    return response;
  }

  response.data = iconv.decode(response.data, charset);
  return response;
};

// Fetch open graph tags from a URL
export const fetchOpenGraph = async (
  url: string,
  verbose = false
): Promise<OpenGraphTags | void> => {
  const request: AxiosRequestConfig = {
    method: "GET",
    url: url,
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": DISCORD_BOT_USER_AGENT
    },
    // We need to get the raw data so we can transcode it
    // using the right encoding returned by the http server.
    responseType: "arraybuffer"
  };

  const transcodingAxios = axios.create();
  transcodingAxios.interceptors.response.use(transcodeResponse);

  const content: string | null = await transcodingAxios(request)
    .then((response: { data: any }) => {
      //console.log('Response:', response.data.substring(0, 1000));
      return response.data.toString();
    })
    .catch((err: any) => {
      console.log("Error:", err.code, err.response.status);
      return null;
    });

  if (verbose) {
    console.log("Content:", content);
  }

  if (!content) {
    return null;
  }

  return parseOpenGraph(content);
};
