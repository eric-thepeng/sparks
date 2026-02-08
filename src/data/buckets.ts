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
 * Buckets are loaded from the backend only (syncBucketsFromBackend).
 */
export let BUCKETS: Bucket[] = [];

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

/** Normalize bucket display name (e.g. backend "AI & Future Tech" → "Ai Innovations") */
function normalizeBucketName(name: string): string {
  if (!name || typeof name !== 'string') return name;
  const t = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (t === 'ai & future tech' || t === 'ai and future tech') return 'Ai Innovations';
  return name;
}

/**
 * 从后端同步 Buckets 数据
 */
export async function syncBucketsFromBackend() {
  try {
    const backendBuckets = await fetchBuckets();
    if (backendBuckets && Array.isArray(backendBuckets)) {
      BUCKETS = backendBuckets.map(b => {
        const rawName = b.title || b.name || b.display_name || '';
        return {
          id: b.key || b.id || b.bucket_key,
          name: normalizeBucketName(rawName),
          emoji: b.emoji || '📚',
          subtitle: b.subtitle || b.description || ''
        };
      });
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
