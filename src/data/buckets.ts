/**
 * Bucket 数据定义
 * 用于 Onboarding 和推荐系统
 */

export interface Bucket {
  id: string;
  name: string;
  emoji: string;
}

/**
 * 10 个内容分类 Bucket
 */
export const BUCKETS: Bucket[] = [
  { id: 'cognition_thinking', name: 'Cognition', emoji: '🧠' },
  { id: 'psychology_emotion', name: 'Psychology', emoji: '💭' },
  { id: 'decision_risk_uncertainty', name: 'Decisions', emoji: '🎲' },
  { id: 'life_biology_evolution', name: 'Biology', emoji: '🧬' },
  { id: 'universe_earth_nature', name: 'Universe', emoji: '🌍' },
  { id: 'history_science_invention', name: 'History', emoji: '⚡' },
  { id: 'society_organizations_business', name: 'Society', emoji: '🏛️' },
  { id: 'technology_humanity', name: 'Technology', emoji: '🤖' },
  { id: 'art_aesthetics', name: 'Art', emoji: '🎨' },
  { id: 'design_product_hci', name: 'Design', emoji: '✨' },
];

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
