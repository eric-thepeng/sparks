// This file acts as your "Raw Database"
// You can paste the converted JSON content from your JSONL file here.

export interface RawPost {
    uid: string;
    title: string;
    content: string;
}

// SAMPLE DATA - Replace this array with your full 50 entries
export const RAW_POSTS: RawPost[] = [
    {
        uid: "101",
        title: "Workspace Aesthetics",
        content: "Finally got the lighting right in my home office. The indigo accent wall really helps with focus."
    },
    {
        uid: "102",
        title: "Hidden Cafe in Tokyo",
        content: "Found this amazing spot while wandering through Shimokitazawa. The coffee is to die for."
    },
    {
        uid: "103",
        title: "Sunday Morning Read",
        content: "Nothing beats a slow morning with a good book and some tea. Currently reading 'Design of Everyday Things'."
    },
    {
        uid: "104",
        title: "Minimalist Packing",
        content: "My gear for a 3-day trip. Trying to keep it light and functional."
    },
    {
        uid: "105",
        title: "Art Gallery Visit",
        content: "The use of negative space in this exhibition was incredibly inspiring for my next project."
    },
    {
        uid: "106",
        title: "Healthy Lunch Ideas",
        content: "Quinoa salad with avocado and roasted chickpeas. Super easy to meal prep for the week."
    },
    {
        uid: "107",
        title: "Tech Essentials",
        content: "My daily drivers: Laptop, noise-cancelling headphones, and a mechanical keyboard."
    },
    {
        uid: "108",
        title: "Sunset Vibes",
        content: "Caught this beautiful gradient in the sky yesterday. Nature has the best color palette."
    }
];