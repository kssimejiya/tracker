import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, arrayUnion, doc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCMlAnvnVqfscNGMwiOHJxjpIZeXLzXKXk",
  authDomain: "tarcker-e47ab.firebaseapp.com",
  projectId: "tarcker-e47ab",
  storageBucket: "tarcker- e47ab.appspot.com",
  messagingSenderId: "65287794968",
  appId: "1:65287794968:ios:ec135a976153ca0018ae6d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signupUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);

export const createExpenseGroup = async (name, creatorId) => {
  const docRef = await addDoc(collection(db, 'expenseGroups'), {
    name,
    members: [creatorId],
    createdBy: creatorId,
    createdAt: new Date()
  });
  return docRef.id;
};

export const inviteToGroup = async (groupId, email) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("User not found");
  }

  const userId = querySnapshot.docs[0].id;
  const groupRef = doc(db, 'expenseGroups', groupId);
  await updateDoc(groupRef, {
    members: arrayUnion(userId)
  });
};

export const addExpense = async (groupId, expense) => {
  await addDoc(collection(db, `expenseGroups/${groupId}/expenses`), {
    ...expense,
    createdAt: new Date()
  });
};

export const getGroupExpenses = (groupId, callback) => {
  const q = query(collection(db, `expenseGroups/${groupId}/expenses`));
  return onSnapshot(q, (querySnapshot) => {
    const expenses = [];
    querySnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() });
    });
    callback(expenses);
  });
};

export const getUserGroups = (userId, callback) => {
  const q = query(collection(db, 'expenseGroups'), where("members", "array-contains", userId));
  return onSnapshot(q, (querySnapshot) => {
    const groups = [];
    querySnapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    callback(groups);
  });
};

