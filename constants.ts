import { Question } from './types';

export const COLOR_MAP = {
  'White': '#FFFFFF',
  'Beige': '#F5F5DC',
  'Tan': '#D2B48C',
  'Brown': '#967969',
  'Charcoal': '#4A4A4A',
  'Olive': '#52554A',
  'Forest': '#3D550C',
  'Light Blue': '#ADD8E6',
  'Navy': '#001F54',
  'Black': '#1A1A1A',
  'Pink': '#FFC0CB',
  'Lavender': '#E0B0FF',
  'Red': '#DC143C',
  'Maroon': '#800000',
  'Yellow': '#FFD700',
};

export const STYLE_QUESTIONS: Question[] = [
  {
    id: 'occasion',
    text: 'What do you need outfits for?',
    type: 'multiple',
    options: ['Work', 'Dating', 'Everyday', 'Events', 'Travel', 'Other'],
  },
  {
    id: 'perception',
    text: 'How do you want to be perceived?',
    type: 'multiple',
    options: ['Relaxed', 'Creative', 'Confident', 'Low-key', 'Sharp', 'Mature', 'Edgy', 'Approachable'],
  },
  {
    id: 'colors',
    text: 'Which colors do you naturally like wearing?',
    type: 'multiple',
    options: Object.keys(COLOR_MAP),
  },
  {
    id: 'fit',
    text: 'How do you like your clothes to fit?',
    type: 'slider',
  },
  {
    id: 'effort',
    text: 'How much effort do you want to put into outfits?',
    type: 'single',
    options: ['Low', 'Medium', 'High'],
  },
  {
    id: 'constraints',
    text: 'Any preferences or constraints?',
    type: 'multiple',
    options: ['Hot climate', 'Cold climate', 'No ironing', 'Machine-wash only', 'No logos', 'No leather', 'Athletic build', 'Plus size'],
  },
];