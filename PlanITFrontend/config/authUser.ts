import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth";
import { firebaseConfig } from "./config";

const auth = getAuth(initializeApp(firebaseConfig));

export { auth };

export async function iniciarSesion(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            throw error;
        });
}

export function getCurrentUser(): Promise<User | null> {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                resolve(user);
            },
            (error) => {
                unsubscribe();
                reject(error);
            }
        );
    });
}