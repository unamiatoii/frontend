// // server.js
// import { ref, set, update, remove, onValue, push } from '../database/firebase';
// import { database } from './database/firebase';

// // Ajout d'un utilisateur actif
// export const addUser = (userId) => {
//   const userRef = ref(database, `activeUsers/${userId}`);
//   set(userRef, { inChat: false });
// };

// // Suppression d'un utilisateur actif
// export const removeUser = (userId) => {
//   const userRef = ref(database, `activeUsers/${userId}`);
//   remove(userRef);
// };

// // Mettre à jour l'état de chat d'un utilisateur
// export const updateUserChatStatus = (userId, inChat) => {
//   const userRef = ref(database, `activeUsers/${userId}`);
//   update(userRef, { inChat });
// };

// // Obtenir les utilisateurs disponibles
// export const getAvailableUsers = (userId, callback) => {
//   const activeUsersRef = ref(database, 'activeUsers');
//   onValue(activeUsersRef, (snapshot) => {
//     const activeUsers = snapshot.val();
//     if (activeUsers) {
//       const availableUsers = Object.keys(activeUsers).filter(id => id !== userId && !activeUsers[id].inChat);
//       callback(availableUsers);
//     } else {
//       callback([]);
//     }
//   });
// };

// // Démarrer une conversation
// export const startConversation = (userId, partnerId, callback) => {
//   const conversationRef = push(ref(database, 'conversations'));
//   const conversationId = conversationRef.key;
//   set(conversationRef, {
//     users: { [userId]: true, [partnerId]: true },
//     messages: []
//   });
//   updateUserChatStatus(userId, true);
//   updateUserChatStatus(partnerId, true);
//   callback(conversationId);
// };
