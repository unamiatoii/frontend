import React, { useState, useEffect } from "react";
import { database } from "./../../database/firebase";
import { ref, get, update, remove } from "firebase/database";
import { useNavigate } from "react-router-dom";
import './admin.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Récupérer les utilisateurs depuis Firebase
    const fetchUsers = async () => {
      try {
        const usersRef = ref(database, "users");
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const usersList = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setUsers(usersList);
        } else {
          setError("Aucun utilisateur trouvé.");
        }
      } catch (err) {
        console.error(err);
        setError("Erreur lors de la récupération des utilisateurs.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleDeactivate = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, { isActive: false });
      alert("Utilisateur désactivé.");
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isActive: false } : user
        )
      );
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la désactivation de l'utilisateur.");
    }
  };

  const handleDelete = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await remove(userRef);
      alert("Utilisateur supprimé.");
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la suppression de l'utilisateur.");
    }
  };

  const handleBan = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, { isBanned: true });
      alert("Utilisateur banni.");
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isBanned: true } : user
        )
      );
    } catch (err) {
      console.error(err);
      setError("Erreur lors du bannissement de l'utilisateur.");
    }
  };

  const handleSpam = async (conversationId) => {
    try {
      const conversationRef = ref(database, `conversations/${conversationId}`);
      await update(conversationRef, { isSpam: true });
      alert("Conversation marquée comme spam.");
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la gestion du spam.");
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>Tableau de Bord Administrateur</h2>
      {loading ? (
        <p>Chargement des utilisateurs...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <div className="user-list">
            {users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="user-card">
                  <p>Email: {user.email}</p>
                  <p>Statut: {user.isActive ? "Actif" : "Désactivé"}</p>
                  <p>Banni: {user.isBanned ? "Oui" : "Non"}</p>
                  <button onClick={() => handleDeactivate(user.id)}>
                    Désactiver
                  </button>
                  <button onClick={() => handleDelete(user.id)}>Supprimer</button>
                  <button onClick={() => handleBan(user.id)}>Bannir</button>
                </div>
              ))
            ) : (
              <p>Aucun utilisateur trouvé.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
