import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  type User
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
      // Non facciamo il redirect qui
    });

    return () => unsubscribe();
  }, [navigate]);

  return { user, isLoading, error };
}

export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Verifica che l'utente esista
  if (!userCredential.user) {
    throw new Error('Errore durante il login');
  }

  // Verifica che esista il profilo
  const profileRef = doc(db, 'profiles', userCredential.user.uid);
  const profileSnap = await getDoc(profileRef);

  // Se il profilo non esiste, crealo
  if (!profileSnap.exists()) {
    await setDoc(profileRef, {
      id: userCredential.user.uid,
      email: userCredential.user.email,
      role: 'waiter',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return userCredential.user;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Create user profile
  await setDoc(doc(db, 'profiles', user.uid), {
    id: user.uid,
    email,
    full_name: fullName,
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function getCurrentUser() {
  if (!auth.currentUser) return null;

  const docRef = doc(db, 'profiles', auth.currentUser.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  }

  // Create profile if it doesn't exist
  const profile = {
    id: auth.currentUser.uid,
    email: auth.currentUser.email,
    role: 'waiter',
    updated_at: new Date().toISOString()
  };

  await setDoc(docRef, profile);
  return profile;
}

export async function changeUserPassword(userId: string, newPassword: string) {
  // Verifica che l'utente corrente sia admin
  const currentUserProfile = await getCurrentUser();
  if (!currentUserProfile || currentUserProfile.role !== 'admin') {
    throw new Error('Solo gli amministratori possono cambiare le password');
  }

  // Trova l'utente nel database
  const usersRef = collection(db, 'profiles');
  const q = query(usersRef, where('id', '==', userId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Utente non trovato');
  }

  // Aggiorna la password
  const user = auth.currentUser;
  if (!user) throw new Error('Non autorizzato');
  
  await updatePassword(user, newPassword);
}