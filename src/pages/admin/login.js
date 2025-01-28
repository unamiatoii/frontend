import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "./../../database/firebase";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import './login.css';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Connexion avec les identifiants de l'utilisateur
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Vérifier si l'utilisateur est un admin
      const userId = userCredential.user.uid;
      const userRef = ref(database, `users/${userId}`); // Accéder aux données de l'utilisateur
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.isAdmin) {
          // Si l'utilisateur est un admin, rediriger vers le dashboard admin
          navigate("/admin-dashboard");
        } else {
          setError("Vous n'êtes pas autorisé à accéder à cette page.");
        }
      } else {
        setError("Utilisateur non trouvé.");
      }
    } catch (err) {
      setError("Identifiants invalides ou erreur serveur.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Connexion Admin</h2>
      <form onSubmit={handleLogin} className="login-form">
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Entrez votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Mot de passe</label>
          <input
            type="password"
            id="password"
            placeholder="Entrez votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Chargement..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
};

export default Login;
