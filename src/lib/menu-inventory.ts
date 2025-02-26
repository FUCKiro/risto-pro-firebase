import { 
  collection,
  doc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface MenuItemIngredient {
  id: number;
  menu_item_id: number;
  inventory_item_id: number;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItemIngredientWithDetails extends MenuItemIngredient {
  inventory_item: {
    name: string;
    quantity: number;
    unit: string;
  };
}

export interface IngredientAvailability {
  ingredient_name: string;
  required_quantity: number;
  available_quantity: number;
  unit: string;
}

export async function getMenuItemIngredients(menuItemId: number): Promise<MenuItemIngredientWithDetails[]> {
  const ingredientsRef = collection(db, 'menu_item_ingredients');
  const q = query(ingredientsRef, where('menu_item_id', '==', menuItemId));
  const querySnapshot = await getDocs(q);

  const ingredients = await Promise.all(querySnapshot.docs.map(async (doc) => {
    const data = doc.data();
    const inventoryItemRef = doc(db, 'inventory_items', data.inventory_item_id.toString());
    const inventoryItemSnap = await getDocs(query(collection(db, 'inventory_items'), where('id', '==', data.inventory_item_id)));
    const inventoryItem = inventoryItemSnap.docs[0].data();

    return {
      id: parseInt(doc.id),
      ...data,
      inventory_item: {
        name: inventoryItem.name,
        quantity: inventoryItem.quantity,
        unit: inventoryItem.unit
      }
    };
  }));

  return ingredients as MenuItemIngredientWithDetails[];
}

export async function addMenuItemIngredient(data: {
  menu_item_id: number;
  inventory_item_id: number;
  quantity: number;
  unit: string;
}): Promise<void> {
  const ingredientsRef = collection(db, 'menu_item_ingredients');
  await addDoc(ingredientsRef, {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function updateMenuItemIngredient(
  id: number,
  data: {
    quantity: number;
    unit: string;
  }
): Promise<void> {
  const docRef = doc(db, 'menu_item_ingredients', id.toString());
  await updateDoc(docRef, {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteMenuItemIngredient(id: number): Promise<void> {
  const docRef = doc(db, 'menu_item_ingredients', id.toString());
  await deleteDoc(docRef);
}

export async function checkIngredientAvailability(menuItemId: number): Promise<{
  available: boolean;
  missingIngredients: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
  }>;
}> {
  const ingredients = await getMenuItemIngredients(menuItemId);
  
  const missingIngredients = ingredients
    .filter(ing => ing.inventory_item.quantity < ing.quantity)
    .map(ing => ({
      name: ing.inventory_item.name,
      required: ing.quantity,
      available: ing.inventory_item.quantity,
      unit: ing.unit
    }));

  return {
    available: missingIngredients.length === 0,
    missingIngredients
  };
}