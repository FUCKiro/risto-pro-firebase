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
  type DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

export interface Table {
  id: number;
  number: number;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved';
  notes?: string;
  location?: string;
  last_occupied_at?: string;
  merged_with?: number[];
  x_position: number;
  y_position: number;
  created_at: string;
  updated_at: string;
}

export async function getTables() {
  const tablesRef = collection(db, 'tables');
  const querySnapshot = await getDocs(tablesRef);
  
  return querySnapshot.docs.map(doc => ({
    id: parseInt(doc.id),
    ...doc.data()
  })) as Table[];
}

export async function updateTableStatus(id: number, status: Table['status']) {
  const docRef = doc(db, 'tables', id.toString());
  await updateDoc(docRef, {
    status,
    last_occupied_at: status === 'occupied' ? new Date().toISOString() : null,
    updated_at: serverTimestamp()
  });
}

export async function createTable(data: { number: number; capacity: number }) {
  const tablesRef = collection(db, 'tables');
  await addDoc(tablesRef, {
    ...data,
    status: 'free',
    x_position: 0,
    y_position: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function updateTable(id: number, data: { number: number; capacity: number }) {
  const docRef = doc(db, 'tables', id.toString());
  await updateDoc(docRef, {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteTable(id: number) {
  const docRef = doc(db, 'tables', id.toString());
  await deleteDoc(docRef);
}

export async function updateTablePosition(id: number, x: number, y: number) {
  const docRef = doc(db, 'tables', id.toString());
  await updateDoc(docRef, {
    x_position: Math.max(0, Math.round(x * 100) / 100),
    y_position: Math.max(0, Math.round(y * 100) / 100),
    updated_at: serverTimestamp()
  });
}

export async function updateTableNotes(id: number, notes: string) {
  const docRef = doc(db, 'tables', id.toString());
  await updateDoc(docRef, {
    notes,
    updated_at: serverTimestamp()
  });
}

export async function mergeTables(mainTableId: number, tableIdsToMerge: number[]) {
  const docRef = doc(db, 'tables', mainTableId.toString());
  await updateDoc(docRef, {
    merged_with: tableIdsToMerge,
    updated_at: serverTimestamp()
  });
}

export async function unmergeTable(tableId: number) {
  const docRef = doc(db, 'tables', tableId.toString());
  await updateDoc(docRef, {
    merged_with: [],
    updated_at: serverTimestamp()
  });
}

// Funzione per ascoltare i cambiamenti in tempo reale
export function onTablesChange(callback: (tables: Table[]) => void) {
  const tablesRef = collection(db, 'tables');
  return getDocs(tablesRef).then((snapshot) => {
    const tables = snapshot.docs.map(doc => ({
      id: parseInt(doc.id),
      ...doc.data()
    })) as Table[];
    callback(tables);
  });
}