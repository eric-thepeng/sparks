/**
 * Bucket 数据定义
 * 用于 Onboarding 和推荐系统
 */

import { fetchBuckets, fetchTags } from '../api';

/**
 * Bucket 数据定义
 */
export interface Bucket {
  id: string;
  name: string;
  emoji: string;
  subtitle: string;
}

/**
 * Tag 数据定义
 */
export interface Tag {
  id: string;
  name: string;
  emoji: string;
}

/**
 * 15 个内容标签 Tags (Initial static data, will be updated from backend)
 */
export let TAGS: Tag[] = [
  { id: 'myth_mystery', name: 'Myth & Mystery', emoji: '🏺' },
  { id: 'religion', name: 'Religion', emoji: '🙏' },
  { id: 'philosophy', name: 'Philosophy', emoji: '🧠' },
  { id: 'literature', name: 'Literature', emoji: '📖' },
  { id: 'history', name: 'History', emoji: '🏰' },
  { id: 'power_society', name: 'Power & Society', emoji: '🏛️' },
  { id: 'mind', name: 'Mind', emoji: '🧘' },
  { id: 'science_nature', name: 'Science & Nature', emoji: '🧬' },
  { id: 'technology', name: 'Technology', emoji: '🤖' },
  { id: 'art', name: 'Art', emoji: '🖼️' },
  { id: 'aesthetics', name: 'Aesthetics', emoji: '✨' },
  { id: 'food', name: 'Food', emoji: '🥑' },
  { id: 'crime', name: 'Crime', emoji: '🕵️' },
  { id: 'legacy', name: 'Legacy', emoji: '👤' },
];

/**
 * 10 个内容分类 Bucket (Initial static data, will be updated from backend)
 */
export let BUCKETS: Bucket[] = [
  { 
    id: 'cognition_thinking', 
    name: 'Cognition', 
    emoji: '🧠',
    subtitle: 'Explore the patterns of thought and human intelligence'
  },
  { 
    id: 'psychology_emotion', 
    name: 'Psychology', 
    emoji: '💭',
    subtitle: 'Understand the science of behavior and mental processes'
  },
  { 
    id: 'decision_risk_uncertainty', 
    name: 'Decisions', 
    emoji: '🎲',
    subtitle: 'Master the art of logic and strategic choice'
  },
  { 
    id: 'life_biology_evolution', 
    name: 'Biology', 
    emoji: '🧬',
    subtitle: 'Discover the mysteries of living organisms and life'
  },
  { 
    id: 'universe_earth_nature', 
    name: 'Universe', 
    emoji: '🌍',
    subtitle: 'Journey through space, time, and the natural world'
  },
  { 
    id: 'history_science_invention', 
    name: 'History', 
    emoji: '⚡',
    subtitle: 'The epic story of human progress and discovery'
  },
  { 
    id: 'society_organizations_business', 
    name: 'Society', 
    emoji: '🏛️',
    subtitle: 'How we build structures and organize our world'
  },
  { 
    id: 'technology_humanity', 
    name: 'Technology', 
    emoji: '🤖',
    subtitle: 'The intersection of digital tools and human life'
  },
  { 
    id: 'art_aesthetics', 
    name: 'Art', 
    emoji: '🎨',
    subtitle: 'Creative expression and the philosophy of beauty'
  },
  { 
    id: 'design_product_hci', 
    name: 'Design', 
    emoji: '✨',
    subtitle: 'Crafting experiences that bridge people and things'
  },
];

/**
 * 从后端同步 Tags 数据
 */
export async function syncTagsFromBackend() {
  try {
    const backendTags = await fetchTags();
    if (backendTags && Array.isArray(backendTags)) {
      TAGS = backendTags.map(t => ({
        id: t.id || t.key || t.tag_id,
        name: t.name || t.title || t.display_name,
        emoji: t.emoji || '🏷️'
      }));
    }
  } catch (error) {
  }
}

/**
 * 从后端同步 Buckets 数据
 */
export async function syncBucketsFromBackend() {
  try {
    const backendBuckets = await fetchBuckets();
    if (backendBuckets && Array.isArray(backendBuckets)) {
      BUCKETS = backendBuckets.map(b => ({
        id: b.key || b.id || b.bucket_key,
        name: b.title || b.name || b.display_name,
        emoji: b.emoji || '📚',
        subtitle: b.subtitle || b.description || ''
      }));
    }
  } catch (error) {
  }
}

/**
 * 用户兴趣等级
 */
export type InterestLevel = 'none' | 'interested' | 'super_interested';

/**
 * Onboarding 提交数据
 */
export interface OnboardingPayload {
  interests: Record<string, InterestLevel>;
}

/**
 * 获取 bucket 的显示名称
 */
export function getBucketName(bucketId: string): string {
  const bucket = BUCKETS.find(b => b.id === bucketId);
  return bucket?.name || bucketId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * 获取 bucket 的 emoji
 */
export function getBucketEmoji(bucketId: string): string {
  const bucket = BUCKETS.find(b => b.id === bucketId);
  return bucket?.emoji || '📚';
}

/**
 * 获取 bucket 的子标题
 */
export function getBucketSubtitle(bucketId: string): string {
  const bucket = BUCKETS.find(b => b.id === bucketId);
  return bucket?.subtitle || 'Explore fascinating insights on this topic';
}
