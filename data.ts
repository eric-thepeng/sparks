
import { Post } from './types';

const users = [
  { id: 'u1', name: 'Alice Style', avatar: 'https://picsum.photos/id/64/100/100' },
  { id: 'u2', name: 'Travel Tom', avatar: 'https://picsum.photos/id/177/100/100' },
  { id: 'u3', name: 'Foodie Jin', avatar: 'https://picsum.photos/id/823/100/100' },
  { id: 'u4', name: 'Design Daily', avatar: 'https://picsum.photos/id/338/100/100' },
  { id: 'u5', name: 'Cat Lover', avatar: 'https://picsum.photos/id/40/100/100' },
  { id: 'u6', name: 'Tech Guru', avatar: 'https://picsum.photos/id/2/100/100' },
];

const titles = [
  "My Morning Routine ☀️ #lifestyle",
  "Hidden gem in the city! Coffee was amazing ☕️",
  "OOTD: Indigo vibes only 💜",
  "How to organize your desk for max productivity",
  "Weekend getaway to the mountains 🏔️",
  "Tried the new viral recipe, honestly 10/10 🍝",
  "Just curious: what's your favorite color?",
  "Minimalist home decor inspiration ✨",
  "My cat did this today... 😂",
  "Reviewing the latest tech gadgets",
  "Study with me! 2 hour session",
  "Sunset lover 🌅",
  "The perfect indigo aesthetic",
  "DIY: Customizing my phone case",
  "Spring fashion haul 🌸"
];

const descriptions = [
  "Honestly, I never thought I'd find something this perfect. The vibe is just unmatched. 💜\n\nI've been looking for this for weeks and finally stumbled upon it yesterday. If you're curious about where I got it, check the link in my bio! \n\n#indigo #aesthetic #dailyvlog",
  "Can we talk about how stunning this is? ✨\n\nThe details are absolutely incredible. I spent about 2 hours here just soaking it all in. Definitely recommend if you are in the area. \n\nLet me know if you want more recs like this!",
  "Just a little moment of peace in a chaotic week. \n\nRemember to take time for yourself and stay curious about the world around you. 🌎\n\nWhat are you grateful for today?",
  "Tried something new today and I'm obsessed! \n\nIt's crazy how small changes can make such a big difference in your daily routine. Highly recommend giving this a shot. \n\nDrop a comment if you've tried it too! 👇"
];

const tagsList = ['lifestyle', 'indigo', 'curiosity', 'daily', 'aesthetic', 'tech', 'food', 'travel', 'fashion'];

// Helper to generate random integer
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generatePosts = (count: number): Post[] => {
  return Array.from({ length: count }).map((_, i) => {
    // Randomize aspect ratio by varying height relative to a fixed width base
    const width = 400;
    const height = randomInt(400, 650); 
    const isVideo = Math.random() > 0.8;
    
    return {
      id: `p${i}`,
      title: titles[i % titles.length],
      description: descriptions[i % descriptions.length],
      tags: [tagsList[i % tagsList.length], tagsList[(i + 1) % tagsList.length]],
      comments: randomInt(5, 200),
      imageUrl: `https://picsum.photos/seed/${i * 123}/${width}/${height}`,
      width,
      height,
      likes: randomInt(10, 5000),
      isLiked: Math.random() > 0.7,
      isCollected: Math.random() > 0.8,
      user: users[i % users.length],
      type: isVideo ? 'video' : 'image',
      date: `2023-${randomInt(1, 12).toString().padStart(2, '0')}-${randomInt(1, 28).toString().padStart(2, '0')}`,
    };
  });
};

export const INITIAL_POSTS = generatePosts(20);
