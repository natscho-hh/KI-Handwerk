"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== passwordConfirm) {
      setError("Passwoerter stimmen nicht ueberein.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Konto erstellen</CardTitle>
          <CardDescription>Starte jetzt mit KI Handwerk</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firma.de"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Passwort wiederholen</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mit der Registrierung stimmst du der Verarbeitung deiner Daten gemaess unserer Datenschutzerklaerung zu.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrieren..." : "Kostenlos registrieren"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Schon ein Konto?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Anmelden
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
