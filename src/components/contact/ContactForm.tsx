"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import styles from "./ContactForm.module.css";
import React from 'react';
import toast from "@/lib/toast";

export default function ContactForm() {
    const t = useTranslations("contactPage.form");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error("Failed to send message");

            toast.success(t("success"));
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            console.error(error);
            toast.error(t("error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.formContainer}>
            <h2 className={styles.title}>{t("title")}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                    <label htmlFor="name" className={styles.label}>{t("name")}</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        className={styles.input}
                        placeholder={t("placeholders.name")}
                        required
                        disabled={loading}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="email" className={styles.label}>{t("email")}</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className={styles.input}
                        placeholder={t("placeholders.email")}
                        required
                        disabled={loading}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="subject" className={styles.label}>{t("subject")}</label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        className={styles.input}
                        placeholder={t("placeholders.subject")}
                        required
                        disabled={loading}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="message" className={styles.label}>{t("message")}</label>
                    <textarea
                        id="message"
                        name="message"
                        className={styles.textarea}
                        placeholder={t("placeholders.message")}
                        required
                        disabled={loading}
                    />
                </div>

                <button type="submit" className={styles.submitButton} disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            {t("sending")}
                        </>
                    ) : (
                        <>
                            {t("submit")}
                            <Send size={20} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
