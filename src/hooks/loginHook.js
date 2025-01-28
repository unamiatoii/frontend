import { useState, useEffect } from "react";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const useLogin = () => {
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth)
          .then((result) => {
            setUser(result.user);
          })
          .catch((err) => {
            console.error("Erreur lors de la connexion anonyme :", err);
            setError(err.message);
          });
      }
      setLoading(false); // Arrête le chargement après l'authentification
    });

    return () => unsubscribe(); // Nettoie l'écouteur lors du démontage du composant
  }, []);

  return { user, loading, error };
};

export default useLogin;
