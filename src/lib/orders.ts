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
  onSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import type { Table } from './tables';
import type { MenuItem } from './menu';

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  notes?: string;
  weight_kg?: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  created_at: string;
  updated_at: string;
  menu_item?: MenuItem;
}

export interface Order {
  id: number;
  table_id: number;
  waiter_id: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  table?: Table;
  items?: OrderItem[];
}

export async function getOrders() {
  const ordersRef = collection(db, 'orders');
  const ordersSnapshot = await getDocs(ordersRef);
  
  const orders = await Promise.all(ordersSnapshot.docs.map(async (doc) => {
    const orderData = doc.data();
    
    // Get table data
    const tableRef = doc(db, 'tables', orderData.table_id.toString());
    const tableSnap = await getDocs(query(collection(db, 'tables'), where('id', '==', orderData.table_id)));
    const table = tableSnap.docs[0]?.data();

    // Get order items
    const itemsRef = collection(db, 'order_items');
    const q = query(itemsRef, where('order_id', '==', parseInt(doc.id)));
    const itemsSnapshot = await getDocs(q);
    
    const items = await Promise.all(itemsSnapshot.docs.map(async (itemDoc) => {
      const itemData = itemDoc.data();
      
      // Get menu item data
      const menuItemRef = doc(db, 'menu_items', itemData.menu_item_id.toString());
      const menuItemSnap = await getDocs(query(collection(db, 'menu_items'), where('id', '==', itemData.menu_item_id)));
      const menuItem = menuItemSnap.docs[0]?.data();

      return {
        id: parseInt(itemDoc.id),
        ...itemData,
        menu_item: menuItem
      };
    }));

    return {
      id: parseInt(doc.id),
      ...orderData,
      table,
      items
    };
  }));

  return orders;
}

export async function createOrder(data: {
  table_id: number;
  notes?: string;
  items: Array<{
    menu_item_id: number;
    quantity: number;
    weight_kg?: number;
    notes?: string;
  }>;
}) {
  // Create order
  const ordersRef = collection(db, 'orders');
  const orderDoc = await addDoc(ordersRef, {
    table_id: data.table_id,
    waiter_id: auth.currentUser?.uid,
    status: 'pending',
    notes: data.notes,
    total_amount: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  // Create order items
  const itemsRef = collection(db, 'order_items');
  await Promise.all(data.items.map(item => 
    addDoc(itemsRef, {
      order_id: parseInt(orderDoc.id),
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      weight_kg: item.weight_kg,
      notes: item.notes,
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  ));

  // Calculate and update total
  await updateOrderTotal(parseInt(orderDoc.id));
}

export async function addToOrder(orderId: number, items: Array<{
  menu_item_id: number;
  quantity: number;
  weight_kg?: number;
  notes?: string;
}>) {
  const itemsRef = collection(db, 'order_items');
  await Promise.all(items.map(item => 
    addDoc(itemsRef, {
      order_id: orderId,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      weight_kg: item.weight_kg,
      notes: item.notes,
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  ));

  // Update order total
  await updateOrderTotal(orderId);
}

export async function updateOrderStatus(orderId: number, status: Order['status']) {
  const docRef = doc(db, 'orders', orderId.toString());
  await updateDoc(docRef, {
    status,
    updated_at: serverTimestamp()
  });
}

export async function updateOrderItemStatus(itemId: number, status: OrderItem['status']) {
  const docRef = doc(db, 'order_items', itemId.toString());
  await updateDoc(docRef, {
    status,
    updated_at: serverTimestamp()
  });

  // Get order ID and update order status
  const itemSnap = await getDocs(query(collection(db, 'order_items'), where('id', '==', itemId)));
  const orderId = itemSnap.docs[0]?.data().order_id;
  if (orderId) {
    await updateOrderStatusFromItems(orderId);
  }
}

export async function deleteOrder(id: number) {
  // Delete order items first
  const itemsRef = collection(db, 'order_items');
  const q = query(itemsRef, where('order_id', '==', id));
  const itemsSnapshot = await getDocs(q);
  
  await Promise.all(itemsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

  // Then delete the order
  const docRef = doc(db, 'orders', id.toString());
  await deleteDoc(docRef);
}

// Helper functions
async function updateOrderTotal(orderId: number) {
  const itemsRef = collection(db, 'order_items');
  const q = query(itemsRef, where('order_id', '==', orderId));
  const itemsSnapshot = await getDocs(q);

  let total = 0;
  await Promise.all(itemsSnapshot.docs.map(async (doc) => {
    const item = doc.data();
    if (item.status === 'cancelled') return;

    const menuItemSnap = await getDocs(query(collection(db, 'menu_items'), where('id', '==', item.menu_item_id)));
    const menuItem = menuItemSnap.docs[0]?.data();
    if (!menuItem) return;

    if (menuItem.is_weight_based && item.weight_kg) {
      total += menuItem.price_per_kg * item.weight_kg * item.quantity;
    } else {
      total += menuItem.price * item.quantity;
    }
  }));

  const orderRef = doc(db, 'orders', orderId.toString());
  await updateDoc(orderRef, {
    total_amount: total,
    updated_at: serverTimestamp()
  });
}

async function updateOrderStatusFromItems(orderId: number) {
  const itemsRef = collection(db, 'order_items');
  const q = query(itemsRef, where('order_id', '==', orderId));
  const itemsSnapshot = await getDocs(q);

  const items = itemsSnapshot.docs.map(doc => doc.data());
  const activeItems = items.filter(item => item.status !== 'cancelled');

  if (activeItems.length === 0) return;

  let newStatus: Order['status'] = 'pending';
  
  if (activeItems.every(item => item.status === 'served')) {
    newStatus = 'served';
  } else if (activeItems.every(item => item.status === 'ready')) {
    newStatus = 'ready';
  } else if (activeItems.some(item => item.status === 'preparing')) {
    newStatus = 'preparing';
  }

  const orderRef = doc(db, 'orders', orderId.toString());
  const orderSnap = await getDocs(query(collection(db, 'orders'), where('id', '==', orderId)));
  const currentStatus = orderSnap.docs[0]?.data().status;

  if (currentStatus !== 'paid' && currentStatus !== 'cancelled') {
    await updateDoc(orderRef, {
      status: newStatus,
      updated_at: serverTimestamp()
    });
  }
}

// Real-time updates
export function onOrdersChange(callback: () => void) {
  const ordersRef = collection(db, 'orders');
  const itemsRef = collection(db, 'order_items');
  
  const unsubOrders = onSnapshot(ordersRef, callback);
  const unsubItems = onSnapshot(itemsRef, callback);
  
  return () => {
    unsubOrders();
    unsubItems();
  };
}