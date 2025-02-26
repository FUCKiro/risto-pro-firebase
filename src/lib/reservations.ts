import { 
  collection,
  doc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

export interface Reservation {
  id: number;
  table_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  guests: number;
  date: string;
  time: string;
  duration: string;
  notes?: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export async function getReservations(date?: string) {
  const reservationsRef = collection(db, 'reservations');
  let q = query(reservationsRef);
  
  if (date) {
    q = query(reservationsRef, where('date', '==', date));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: parseInt(doc.id),
    ...doc.data()
  })) as Reservation[];
}

export async function createReservation(data: Omit<Reservation, 'id' | 'created_at' | 'updated_at' | 'status'>) {
  const reservationsRef = collection(db, 'reservations');
  await addDoc(reservationsRef, {
    ...data,
    status: 'confirmed',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function updateReservation(id: number, data: Partial<Reservation>) {
  const docRef = doc(db, 'reservations', id.toString());
  await updateDoc(docRef, {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteReservation(id: number) {
  const docRef = doc(db, 'reservations', id.toString());
  await deleteDoc(docRef);
}

export function onReservationsChange(callback: () => void) {
  const reservationsRef = collection(db, 'reservations');
  return onSnapshot(reservationsRef, callback);
}