'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { searchCatastro } from '@/app/actions';
import type { ActionState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Search, MapPin, Globe, Mountain, AlertTriangle, Building, Home, Calendar, Thermometer } from 'lucide-react';
import { Separator } from './ui/separator';

const initialState: ActionState = { data: null, error: null };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-[130px]" variant="default">
            {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
                <>
                    <Search className="mr-2 h-4 w-4" /> Buscar
                </>
            )}
        </Button>
    );
}

function Results({ state }: { state: ActionState }) {
    const { pending } = useFormStatus();

    if (pending) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-lg text-muted-foreground">Obteniendo localización y datos...</p>
            </div>
        );
    }

    if (state.error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error en la búsqueda</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        );
    }
    
    if (!state.data) {
        return (
            <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                <p className="text-lg">Introduce una referencia catastral para comenzar.</p>
            </div>
        );
    }

    const { address, municipality, province, postalCode, constructionYear, ineCode, municipalityIneCode, latitude, longitude, altitude, ignAddress, climaticZone, climaticZoneRule } = state.data;
    
    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* 1. Datos de Localización */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <MapPin className="text-primary h-6 w-6"/>
                        <span>Localización</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col items-center p-3 rounded-lg bg-secondary/30">
                            <Globe className="h-5 w-5 text-muted-foreground mb-1" />
                            <span className="text-xs font-medium text-muted-foreground uppercase">Latitud</span>
                            <span className="text-lg font-semibold">{latitude.toFixed(6)}</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-lg bg-secondary/30">
                            <Globe className="h-5 w-5 text-muted-foreground mb-1" />
                            <span className="text-xs font-medium text-muted-foreground uppercase">Longitud</span>
                            <span className="text-lg font-semibold">{longitude.toFixed(6)}</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-lg bg-secondary/30">
                            <Mountain className="h-5 w-5 text-muted-foreground mb-1" />
                            <span className="text-xs font-medium text-muted-foreground uppercase">Altitud</span>
                            <span className="text-lg font-semibold">{altitude.toFixed(0)} m</span>
                        </div>
                    </div>
                    {ignAddress && (
                        <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Dirección según Cartociudad (IGN)</p>
                            <p className="text-base font-medium">{ignAddress}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. Zona Climática */}
            {climaticZone && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Thermometer className="text-primary h-6 w-6"/>
                            <span>Zona Climática (DB-HE)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-6">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                            <span className="text-4xl font-bold">{climaticZone}</span>
                        </div>
                        <div>
                            <p className="text-lg font-medium text-foreground">
                                La zona climática según el CTE es <span className="font-bold">{climaticZone}</span>.
                            </p>
                            {climaticZoneRule && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Criterio: {climaticZoneRule}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 3. Datos del Catastro */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Building className="text-primary h-6 w-6"/>
                        <span>Datos del Catastro</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Dirección (Catastro)</p>
                        <p className="text-base">{address}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Municipio</p>
                        <p className="text-base">{municipality} {municipalityIneCode && <span className="text-xs text-muted-foreground font-mono">(INE: {municipalityIneCode})</span>}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Provincia</p>
                        <p className="text-base">{province} {ineCode && <span className="text-xs text-muted-foreground font-mono">(INE: {ineCode})</span>}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Código Postal</p>
                        <p className="text-base">{postalCode || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Año de Construcción</p>
                        <p className="text-base">{constructionYear || 'No disponible'}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CatastroSearch() {
    const [state, formAction] = useFormState(searchCatastro, initialState);

    return (
        <div className="w-full">
            <form action={formAction} className="space-y-6">
                <div className="flex w-full flex-col sm:flex-row items-stretch gap-2">
                    <Input 
                        name="ref" 
                        placeholder="Introduce la referencia catastral (20 caracteres)" 
                        required 
                        className="flex-grow text-lg h-12" 
                        minLength={14}
                        maxLength={20}
                    />
                    <SubmitButton />
                </div>
                <Separator />
                <Results state={state} />
            </form>
        </div>
    );
}
