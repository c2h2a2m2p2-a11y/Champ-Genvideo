
export type AppState = 'idle' | 'generating-image' | 'generating-video' | 'error';

export interface GenerationConfig {
  background: string;
  pants: string;
  hat: string;
  glasses: string;
  shoes: string;
  videoType: VideoType;
  aspectRatio: '16:9' | '9:16' | '1:1';
}

export type VideoType = 
  | '360_rotation' 
  | 'zoom_in_out' 
  | 'orbit_shot' 
  | 'vertical_pan' 
  | 'dynamic_movement';

export interface AssetRef {
  id: number;
  data: string | null;
  name: string;
}

export const BACKGROUND_OPTIONS = [
  'Minimalist Studio (Grey)',
  'Luxury Fashion Showroom',
  'Modern Street Style (Urban)',
  'Nature Garden (Sunset)',
  'Clean White Background',
  'Professional Retail Store',
  'Industrial Loft'
];

export const PANTS_OPTIONS = [
  'None',
  'Blue Slim Jeans',
  'Black Cargo Pants',
  'Khaki Chinos',
  'Grey Jogger Sweatpants',
  'Baggy Denim Shorts',
  'Formal Suit Trousers'
];

export const HAT_OPTIONS = [
  'None',
  'Baseball Cap',
  'Bucket Hat',
  'Beanie',
  'Wide Brim Sun Hat',
  'Fedora'
];

export const GLASSES_OPTIONS = [
  'None',
  'Classic Sunglasses',
  'Aviator Shades',
  'Modern Rectangular Glasses',
  'Luxury Gold-framed Glasses'
];

export const SHOE_OPTIONS = [
  'None',
  'Clean White Sneakers',
  'Leather Chelsea Boots',
  'Sporty Running Shoes',
  'Classic Loafers',
  'Canvas High-tops'
];

export const VIDEO_TYPE_OPTIONS: { label: string; value: VideoType }[] = [
  { label: '360° Mannequin Rotation', value: '360_rotation' },
  { label: 'Smooth Zoom In/Out', value: 'zoom_in_out' },
  { label: 'Camera Orbiting Mannequin', value: 'orbit_shot' },
  { label: 'Cinematic Vertical Pan', value: 'vertical_pan' },
  { label: 'Dynamic Lifestyle Motion', value: 'dynamic_movement' }
];

export const ASPECT_RATIO_OPTIONS = ['16:9', '9:16', '1:1'] as const;
