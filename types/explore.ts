export interface ExploreLook {
  id: string;
  gender: 'male' | 'female';
  title: string;
  description: string;
  prompt: string;
  imageUrl: string;
  vibe: string;
  styleTag?: string;
}
