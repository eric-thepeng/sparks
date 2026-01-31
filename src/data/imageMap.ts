import { ImageSource } from 'expo-image';

// 图片映射表类型
type ImageMap = {
  [uid: string]: {
    cover: ImageSource;
    images: { [key: string]: ImageSource };
  };
};

export const POST_IMAGES: ImageMap = {};

/**
 * 获取帖子封面图
 * @param uid 帖子 ID
 */
export const getCoverImage = (uid: string): ImageSource | undefined => {
  return POST_IMAGES[uid]?.cover;
};

/**
 * 获取帖子内嵌图片
 * @param uid 帖子 ID
 * @param ref 图片引用 ID
 */
export const getInlineImage = (uid: string, ref: string): ImageSource | undefined => {
  return POST_IMAGES[uid]?.images[ref];
};
