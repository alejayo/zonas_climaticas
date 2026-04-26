
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { searchCatastro } from '@/app/actions';
import type { ActionState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Search, MapPin, Globe, Mountain, Sparkles, AlertTriangle, Building, Home, Calendar, Thermometer } from 'lucide-react';
import { Separator } from './ui/separator';

const initialState: ActionState = { data: null, error: null };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-[130px] transition-all" variant="default">
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
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-lg text-muted-foreground">Buscando datos...</p>
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
                <p className="text-lg">Los resultados de la búsqueda aparecerán aquí.</p>
            </div>
        );
    }

    const { address, municipality, province, postalCode, constructionYear, ineCode, latitude, longitude, altitude, aiDescription, climaticZone, climaticZoneRule } = state.data;
    
    const catastroItems = [
        { icon: MapPin, label: "Dirección", value: address },
        { icon: Home, label: "Municipio", value: municipality },
        { icon: Building, label: "Provincia", value: province ? `${province} (INE: ${ineCode || 'N/A'})` : null },
        { icon: MapPin, label: "Código Postal", value: postalCode },
        { icon: Calendar, label: "Año Construcción", value: constructionYear },
    ];

    const geoItems = [
        { icon: Globe, label: "Latitud", value: latitude.toFixed(6) },
        { icon: Globe, label: "Longitud", value: longitude.toFixed(6) },
        { icon: Mountain, label: "Altitud", value: `${altitude.toFixed(2)} m` },
    ];

    return (
        <div className="space-y-4 animate-in fade-in-50 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="text-primary"/>
                        <span>Datos del Catastro</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {catastroItems.map((item, index) => (
                        item.value && (
                            <div key={index} className="flex items-start gap-3">
                                <item.icon className="h-5 w-5 text-muted-foreground mt-1" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                                    <p className="text-base text-foreground">{item.value}</p>
                                </div>
                            </div>
                        )
                    ))}
                </CardContent>
            </Card>

            {climaticZone && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Thermometer className="text-primary"/>
                        <span>Zona Climática (DB-HE)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="text-4xl font-bold">{climaticZone}</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-base text-foreground">La zona climática de invierno según el CTE DB-HE es <strong>{climaticZone}</strong>.</p>
                        {climaticZoneRule && <p className="text-sm text-muted-foreground">Regla: {climaticZoneRule} a {altitude.toFixed(0)}m de altitud.</p>}
                    </div>
                </CardContent>
            </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="text-primary"/>
                        <span>Datos Geográficos</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    {geoItems.map((item, index) =>(
                        <div key={index} className="flex flex-col items-center space-y-1 rounded-lg bg-secondary/50 p-4">
                            <item.icon className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                            <p className="text-lg font-semibold text-foreground">{item.value}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-accent" />
                        <span className='text-primary'>Análisis Geográfico por IA</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-base leading-relaxed">{aiDescription}</p>
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
                <div className="flex w-full flex-col sm:flex-row items-start gap-2">
                    <Input 
                        name="ref" 
                        placeholder="Introduce la referencia catastral de 20 dígitos" 
                        required 
                        className="flex-grow text-base" 
                        minLength={14}
                        maxLength={20}
                        aria-label="Referencia Catastral"
                        autoComplete="off"
                    />
                    <SubmitButton />
                </div>
                <Separator />
                <Results state={state} />
            </form>
        </div>
    );
}
