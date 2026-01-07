import { Post, User } from '../types';

interface RawPost {
    uid: string;
    title: string;
    content: string;
}

// Mock Users to assign to the raw content
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Style', avatar: 'https://picsum.photos/id/64/100/100' },
  { id: 'u2', name: 'Travel Tom', avatar: 'https://picsum.photos/id/177/100/100' },
  { id: 'u3', name: 'Foodie Jin', avatar: 'https://picsum.photos/id/823/100/100' },
  { id: 'u4', name: 'Design Daily', avatar: 'https://picsum.photos/id/338/100/100' },
  { id: 'u5', name: 'Cat Lover', avatar: 'https://picsum.photos/id/40/100/100' },
  { id: 'u6', name: 'Tech Guru', avatar: 'https://picsum.photos/id/2/100/100' },
];

const ASPECT_RATIOS = [
    { width: 400, height: 533, label: '3:4' }, // Portrait
    { width: 400, height: 400, label: '1:1' }, // Square
    { width: 400, height: 300, label: '4:3' }, // Landscape
];

// Seeded random helper
const getStableRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rnd = Math.abs(Math.sin(hash) * 10000);
    return rnd - Math.floor(rnd);
};

// Transform Raw Data to App Schema
const transformPost = (raw: RawPost): Post => {
    // Ensure raw.uid is a string (handles numbers in JSON) and remove whitespace
    const rawUid = String(raw.uid || '');
    
    // Seed generator
    const seed = rawUid;
    const randomVal = getStableRandom(seed);
    
    // Pick a random user
    const userIndex = Math.floor(randomVal * MOCK_USERS.length);
    const user = MOCK_USERS[userIndex];

    // Pick a random aspect ratio
    const ratioIndex = Math.floor((randomVal * 10) % 3);
    const dimensions = ASPECT_RATIOS[ratioIndex];

    // Construct Image URL
    // 1. Remove any existing extensions (.png, .jpg, etc) to get the "base" name
    // 2. Append .png explicitly as requested
    const cleanId = rawUid.trim().replace(/\.(png|jpg|jpeg|gif)$/i, '');
    const imageUrl = `/tempData/images/${cleanId}.png`;

    return {
        id: rawUid,
        title: raw.title,
        description: raw.content, // Use content directly
        tags: ['lifestyle', 'daily', 'indigo'], 
        comments: Math.floor(randomVal * 200),
        likes: Math.floor(randomVal * 5000),
        isLiked: randomVal > 0.7,
        isCollected: randomVal > 0.8,
        user: user,
        type: 'image',
        date: '2 days ago',
        imageUrl: imageUrl,
        width: dimensions.width,
        height: dimensions.height,
    };
};

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// In-memory cache for the session
let globalPostCache: Post[] | null = null;

const loadAndProcessData = async (): Promise<Post[]> => {
    if (globalPostCache) return globalPostCache;

    try {
        // Fetch the JSONL file
        const response = await fetch('/tempData/posts.jsonl');
        if (!response.ok) {
            console.error(`Failed to fetch posts.jsonl: ${response.status} ${response.statusText}`);
            return [];
        }

        const text = await response.text();
        
        // Parse JSONL (one JSON object per line)
        const rawPosts: RawPost[] = text
            .split('\n')
            .filter(line => line.trim() !== '') 
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.warn("Failed to parse line:", line);
                    return null;
                }
            })
            .filter(item => item !== null) as RawPost[];

        // Transform to application Post format
        const posts = rawPosts.map(transformPost);

        // Apply "The Algorithm": Shuffle the posts to distribute them randomly
        globalPostCache = shuffleArray(posts);
        
        return globalPostCache;
    } catch (error) {
        console.error("Error in loadAndProcessData:", error);
        return [];
    }
};

export const feedService = {
    getPosts: async (page: number = 1, pageSize: number = 10): Promise<Post[]> => {
        await new Promise(resolve => setTimeout(resolve, 400));
        const allPosts = await loadAndProcessData();
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        if (allPosts.length === 0) return [];

        if (start >= allPosts.length) {
            const loopedStart = start % allPosts.length;
            const loopedEnd = loopedStart + pageSize;
            if (loopedEnd > allPosts.length) {
                return [...allPosts.slice(loopedStart), ...allPosts.slice(0, loopedEnd - allPosts.length)];
            }
            return allPosts.slice(loopedStart, loopedEnd);
        }

        return allPosts.slice(start, end);
    }
};