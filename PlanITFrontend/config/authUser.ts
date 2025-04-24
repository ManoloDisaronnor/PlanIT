import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth";
import { apiUrl, firebaseConfig } from "./config";

const auth = getAuth(initializeApp(firebaseConfig));

export { auth };

export async function iniciarSesion(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            throw error;
        });
    setSessionStorage(auth.currentUser?.uid!!)
}

export function getCurrentUser(): Promise<User | null> {
    return new Promise((resolve, reject) => {
        const userDataStr = sessionStorage.getItem('user');
        if (userDataStr) {
            try {
                const unsubscribe = onAuthStateChanged(
                    auth,
                    (user) => {
                        unsubscribe();
                        if (user) {
                            resolve(user);
                        } else {
                            clearSessionStorage();
                            resolve(null);
                        }
                    },
                    (error) => {
                        unsubscribe();
                        reject(error);
                    }
                );
            } catch (e) {
                console.error("Error checking auth state:", e);
                clearSessionStorage();
                resolve(null);
            }
        } else {
            const unsubscribe = onAuthStateChanged(
                auth,
                (user) => {
                    unsubscribe();
                    if (user) {
                        setSessionStorage(user.uid)
                            .then(() => resolve(user))
                            .catch(() => resolve(user));
                    } else {
                        resolve(null);
                    }
                },
                (error) => {
                    unsubscribe();
                    reject(error);
                }
            );
        }
    });
}

export async function setSessionStorage(uid: string) {
    const response = await fetch(`${apiUrl}api/usuarios/${uid}`, {
        method: 'GET',
        credentials: 'include'
    });
    const data = await response.json();
    if (response.ok) {
        const userData = data.datos;
        sessionStorage.setItem('user', JSON.stringify({
            uid: uid,
            imageUrl: userData.imageUrl,
            username: userData.username,
            name: userData.name,
            surname: userData.surname
        }));
    }
}

export function clearSessionStorage() {
    sessionStorage.removeItem('user');
}

export async function logOut() {
    try {
        const response = await fetch(`${apiUrl}api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        if (response.ok) {
            clearSessionStorage();
            auth.signOut()
                .then(() => {
                })
                .catch((error) => {
                });
        } else {
        }
    } catch (error) {
    }
}