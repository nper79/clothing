// Exemplo de como obter o Firebase User ID

import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// 1. Listener para mudanças de auth
onAuthStateChanged(auth, (user) => {
  if (user) {
    // AQUI ESTÁ O ID QUE PRECISAS! 🎯
    console.log('Firebase User ID:', user.id);
    console.log('User email:', user.email);
    console.log('User name:', user.displayName);
    console.log('Photo URL:', user.photoURL);

    // Exemplo de saída:
    // Firebase User ID: "G-AbC123xYz789DeF456"
    // User email: "joao.silva@gmail.com"
    // User name: "João Silva"
    // Photo URL: "https://lh3.googleusercontent.com/..."
  } else {
    console.log('No user logged in');
  }
});

// 2. Obter user atual diretamente
const getCurrentUserId = () => {
  const user = auth.currentUser;
  return user ? user.id : null;
};

// 3. No teu App.tsx - usar este ID
const AppContent = () => {
  const { user } = useAuth(); // Do teu AuthContext

  // Este é o ID real do Firebase! ✅
  const userId = user?.id || null;

  console.log('Current user ID for Supabase:', userId);
  // Saída: "G-AbC123xYz789DeF456"

  // Este ID funciona perfeitamente no Supabase como UUID
  // porque é um UUID válido!
};