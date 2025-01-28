// src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { auth, database } from "../database/firebase"; // Importez Firebase auth et database
import { ref, get } from "firebase/database";

const ProtectedRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUserRole = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;

        if (user) {
          // Récupérer les informations de l'utilisateur dans la base de données
          const adminRef = ref(database, `users/${user.uid}/isAdmin`);
          const snapshot = await get(adminRef);

          // Vérifiez si l'utilisateur est admin
          if (snapshot.exists() && snapshot.val() === true) {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du rôle admin :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  if (loading) {
    return <div>Chargement...</div>; // Affiche un loader pendant la vérification
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />; // Redirige si l'utilisateur n'est pas admin
  }

  return children; // Affiche la page protégée si l'utilisateur est admin
};

export default ProtectedRoute;
