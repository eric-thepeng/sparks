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

/** Normalize bucket display name so tags/sections match intended label */
export function normalizeBucketName(name: string): string {
  if (!name || typeof name !== 'string') return name;
  const t = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (t === 'ai & future tech' || t === 'ai and future tech') return 'Ai Innovations';
  if (t === 'indigenous responses') return 'Colonization Responses';
  return name;
}

/**
 * 从后端同步 Buckets 数据
 */
function idToDisplayName(id: string): string {
  if (!id) return '';
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export async function syncBucketsFromBackend() {
  try {
    const backendBuckets = await fetchBuckets(); // GET /api/buckets — bucket display names (e.g. "Mythology & Traditions") come from here
    if (backendBuckets && Array.isArray(backendBuckets)) {
      BUCKETS = backendBuckets.map(b => {
        const id = b.key || b.id || b.bucket_key || '';
        const rawName = (b.title ?? b.name ?? b.display_name ?? b.label ?? b.bucket_name ?? '') || '';
        const normalized = normalizeBucketName(rawName);
        return {
          id,
          name: normalized || idToDisplayName(id),
          emoji: b.emoji || '📚',
          subtitle: b.subtitle ?? b.description ?? ''
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
 * 获取 bucket 的显示名称（仅按 id 查找）
 */
export function getBucketName(bucketId: string): string {
  const bucket = BUCKETS.find(b => b.id === bucketId);
  return bucket?.name || bucketId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * 返回用于分组和筛选的规范 key：匹配到 bucket 时返回 bucket.id，保证 topic 与 bucket 一致
 */
export function getTopicKey(topic: string): string {
  if (!topic || typeof topic !== 'string') return topic || '';
  const byId = BUCKETS.find(b => b.id === topic);
  if (byId) return byId.id;
  const byName = BUCKETS.find(b => b.name.trim().toLowerCase() === topic.trim().toLowerCase());
  if (byName) return byName.id;
  const normalized = normalizeBucketName(topic);
  const byNormalizedName = BUCKETS.find(b => b.name.trim().toLowerCase() === normalized.trim().toLowerCase());
  if (byNormalizedName) return byNormalizedName.id;
  return topic;
}

/**
 * 获取主题的显示名称，与 Collection 标签一致：先按 id/name 匹配 bucket，再做名称归一化
 */
export function getTopicDisplayName(topic: string): string {
  if (!topic || typeof topic !== 'string') return '';
  const byId = BUCKETS.find(b => b.id === topic);
  if (byId) return byId.name;
  const byName = BUCKETS.find(b => b.name.trim().toLowerCase() === topic.trim().toLowerCase());
  if (byName) return byName.name;
  const normalized = normalizeBucketName(topic);
  if (normalized !== topic) return normalized;
  return topic.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Preferred naming moving forward: use bucket terminology in UI/domain.
 * Backward compatible wrapper over existing topic display resolver.
 */
export function getBucketDisplayName(bucketKey: string): string {
  return getTopicDisplayName(bucketKey);
}

/**
 * 获取 bucket 的 emoji
 */
export function getBucketEmoji(bucketId: string): string {
  const bucket = BUCKETS.find(b => b.id === bucketId);
  return bucket?.emoji || '📚';
}

/**
 * 获取 bucket 的子标题（仅按 id 查找）
 */
export function getBucketSubtitle(bucketId: string): string {
  const bucket = BUCKETS.find(b => b.id === bucketId);
  return bucket?.subtitle || 'Explore fascinating insights on this topic';
}

/**
 * 获取主题的子标题，与 bucket 一致：用 getTopicKey 解析后再取 subtitle
 */
export function getTopicSubtitle(topic: string): string {
  return getBucketSubtitle(getTopicKey(topic));
}
