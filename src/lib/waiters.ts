import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export interface Waiter {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export async function getWaiters() {
  const waitersRef = collection(db, 'profiles');
  const q = query(waitersRef, where('role', '==', 'waiter'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Waiter[];
}

export async function createWaiter(email: string, password: string, fullName: string) {
  // Verifica che l'utente corrente sia admin
  const adminRef = doc(db, 'profiles', auth.currentUser?.uid || '');
  const adminSnap = await getDocs(query(collection(db, 'profiles'), where('id', '==', auth.currentUser?.uid)));
  
  if (!adminSnap.docs[0]?.data()?.role === 'admin') {
    throw new Error('Non hai i permessi per creare camerieri');
  }

  // Crea l'utente con Firebase Auth
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Crea il profilo con ruolo waiter
  await addDoc(collection(db, 'profiles'), {
    id: user.uid,
    email,
    full_name: fullName,
    role: 'waiter',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function deleteWaiter(id: string) {
  const docRef = doc(db, 'profiles', id);
  await deleteDoc(docRef);
}