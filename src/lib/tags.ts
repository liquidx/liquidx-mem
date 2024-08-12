export const iconForTag = (tag: string) => {
  if (!tag) {
    return '';
  }
  switch (tag) {
    case '#art':
      return `🎨`;
    case '#code':
      return `👨‍💻`;
    case '#map':
      return `🗺️`;
    case '#photo':
      return `📷`;
    case '#japan':
    case '#japanese':
      return `🇯🇵`;
    case '#tokyo':
      return `🗼`;
    case '#hongkong':
      return `🇭🇰`;
    case '#house':
      return `🏠`;
    case '#look':
    case '#read':
      return `👀`;
    case '#want':
      return `🤩`;
    case '#3d':
      return `📦`;
    case '#ml':
    case '#ml-generative':
    case '#generated':
    case '#ml-app':
    case '#dreambooth':
    case '#nerf':
    case '#cloudml':
    case '#stablediffusion':
    case '#dalle':
    case '#midjourney':
    case '#llm':
    case '#colab':
      return `🧠`;
    case '#f1':
      return `🏎️`;
    case '#snow':
      return `❄️`;
    case '#datavis':
      return `📊`;
    case '#design':
      return `🎨`;
    case '#keyboard':
      return `⌨️`;
    case '#web':
      return `🌐`;
    case '#music':
      return `🎵`;
    case '#game':
    case '#gaming':
      return `🎮`;
    case '#place':
      return `📍`;
    case '#snowboard':
      return `🏂`;
    case '#furniture':
      return `🛋️`;
    case '#watch':
      return `⌚`;
    default:
      return '🏷️';
  }
};
