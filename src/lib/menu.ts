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

export interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  preparation_time?: string;
  allergens: string[];
  image_url?: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  spiciness_level: number;
  is_weight_based: boolean;
  price_per_kg?: number;
  created_at: string;
  updated_at: string;
}

// Gestione Categorie
export async function getMenuCategories() {
  const categoriesRef = collection(db, 'menu_categories');
  const q = query(categoriesRef, where('is_active', '==', true));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: parseInt(doc.id),
    ...doc.data()
  })) as MenuCategory[];
}

export async function createMenuCategory(data: Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>) {
  const categoriesRef = collection(db, 'menu_categories');
  await addDoc(categoriesRef, {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function updateMenuCategory(id: number, data: Partial<MenuCategory>) {
  const docRef = doc(db, 'menu_categories', id.toString());
  await updateDoc(docRef, {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteMenuCategory(id: number) {
  const docRef = doc(db, 'menu_categories', id.toString());
  await deleteDoc(docRef);
}

// Gestione Menu Items
export async function getMenuItems(categoryId?: number) {
  const itemsRef = collection(db, 'menu_items');
  let q = query(itemsRef);
  
  if (categoryId) {
    q = query(itemsRef, where('category_id', '==', categoryId));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: parseInt(doc.id),
    ...doc.data()
  })) as MenuItem[];
}

export async function createMenuItem(data: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) {
  const itemsRef = collection(db, 'menu_items');
  await addDoc(itemsRef, {
    ...data,
    price: data.is_weight_based ? 0 : data.price,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function updateMenuItem(id: number, data: Partial<MenuItem>) {
  const docRef = doc(db, 'menu_items', id.toString());
  await updateDoc(docRef, {
    ...data,
    price: data.is_weight_based ? 0 : data.price,
    updated_at: serverTimestamp()
  });
}

export async function deleteMenuItem(id: number) {
  const docRef = doc(db, 'menu_items', id.toString());
  await deleteDoc(docRef);
}

// Funzione per ascoltare i cambiamenti in tempo reale
export function onMenuChange(callback: () => void) {
  const categoriesRef = collection(db, 'menu_categories');
  const itemsRef = collection(db, 'menu_items');
  
  const unsubCategories = onSnapshot(categoriesRef, callback);
  const unsubItems = onSnapshot(itemsRef, callback);
  
  // Ritorna una funzione per disiscriversi da entrambi i listener
  return () => {
    unsubCategories();
    unsubItems();
  };
}