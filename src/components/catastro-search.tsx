'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { searchCatastro, searchByCoords } from '@/app/actions';
import type { ActionState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, Search, MapPin, Globe, Mountain, 
    AlertTriangle, Building, Thermometer, Map as MapIcon, 
    Navigation, CheckCircle2, ExternalLink 
} from 'lucide-react';
import { Separator } from './ui/separator';
import 'leaflet/dist/leaflet.css';

const initialState: ActionState = { data: null, error: null };

const MapView = ({ onLocationSelect, currentPos }: { onLocationSelect: (lat: number, lng: number) => void, currentPos?: [number, number] }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const marker = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && mapRef.current && !leafletMap.current) {
            const L = require('leaflet');
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            leafletMap.current = L.map(mapRef.current).setView([40.416775, -3.70379], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(leafletMap.current);

            leafletMap.current.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                if (marker.current) marker.current.remove();
                marker.current = L.marker([lat, lng]).addTo(leafletMap.current);
                onLocationSelect(lat, lng);
            });
        }

        if (leafletMap.current && currentPos) {
            const L = require('leaflet');
            leafletMap.current.setView(currentPos, 16);
            if (marker.current) marker.current.remove();
            marker.current = L.marker(currentPos).addTo(leafletMap.current);
        }
    }, [currentPos, onLocationSelect]);

    return <div ref={mapRef} className="h-[400px] w-full rounded-lg border shadow-inner" />;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-[130px]" variant="default">
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="mr-2 h-4 w-4" /> Buscar</>}
        </Button>
    );
}

export default function CatastroSearch() {
    const [state, formAction] = useFormState(searchCatastro, initialState);
    const [rcValue, setRcValue] = useState('');
    const [addressQuery, setAddressQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mapPos, setMapPos] = useState<[number, number] | undefined>(undefined);

    useEffect(() => {
        if (state.data) {
            setRcValue(state.data.ref);
            setMapPos([state.data.latitude, state.data.longitude]);
        }
    }, [state.data]);

    const handleMapSelect = async (lat: number, lng: number) => {
        setIsSearching(true);
        const newState = await searchByCoords(lat, lng);
        setIsSearching(false);
        if (newState.data) {
            state.data = newState.data;
            state.error = null;
            setRcValue(newState.data.ref);
            setMapPos([lat, lng]);
        } else {
            state.error = newState.error;
            state.data = null;
        }
    };

    const handleAddressInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAddressQuery(val);
        if (val.length > 3) {
            try {
                const res = await fetch(`https://www.cartociudad.es/geocoder/api/geocoder/candidates?q=${encodeURIComponent(val)}&limit=5`);
                const data = await res.json();
                setSuggestions(Array.isArray(data) ? data : (data.candidates || []));
            } catch (err) {
                setSuggestions([]);
            }
        } else {
            setSuggestions([]);
        }
    };

    const selectAddress = async (item: any) => {
        setAddressQuery(item.address || item.description);
        setSuggestions([]);
        const lat = item.lat || item.y;
        const lng = item.lng || item.x;
        if (lat && lng) {
            await handleMapSelect(lat, lng);
        }
    };

    // Función para construir el enlace a la ficha del inmueble
    const getCatastroLink = (rc: string) => {
        if (rc.length < 14) return '#';
        const rc1 = rc.substring(0, 14);
        const rc2 = rc.substring(14);
        if (rc2) {
            return `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc1=${rc.substring(0,7)}&rc2=${rc.substring(7,14)}&car=${rc.substring(14,18)}&cc1=${rc.substring(18,19)}&cc2=${rc.substring(19,20)}`;
        }
        return `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc1=${rc.substring(0,7)}&rc2=${rc.substring(7,14)}`;
    };

    return (
        <div className="w-full space-y-8">
            <Tabs defaultValue="rc" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="rc" className="gap-2"><Building className="h-4 w-4" /> Ref. Catastral</TabsTrigger>
                    <TabsTrigger value="address" className="gap-2"><Navigation className="h-4 w-4" /> Dirección</TabsTrigger>
                    <TabsTrigger value="map" className="gap-2"><MapIcon className="h-4 w-4" /> Mapa</TabsTrigger>
                </TabsList>

                <TabsContent value="rc">
                    <form action={formAction} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input 
                                name="ref" 
                                value={rcValue}
                                onChange={(e) => setRcValue(e.target.value)}
                                placeholder="Ej: 9872023VH5797S..." 
                                required 
                                className="flex-grow text-lg h-12 uppercase" 
                                minLength={14}
                                maxLength={20}
                            />
                            <SubmitButton />
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="address">
                    <div className="relative space-y-2">
                        <div className="flex gap-2">
                            <Input 
                                value={addressQuery}
                                onChange={handleAddressInput}
                                placeholder="Escribe una calle, municipio..." 
                                className="flex-grow text-lg h-12"
                            />
                        </div>
                        {suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                                {suggestions.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => selectAddress(item)}
                                        className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground text-sm transition-colors border-b last:border-0"
                                    >
                                        {item.address || item.description}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="map">
                    <Card>
                        <CardContent className="p-0 overflow-hidden rounded-lg">
                            <MapView onLocationSelect={handleMapSelect} currentPos={mapPos} />
                        </CardContent>
                    </Card>
                    <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Haz clic en el mapa para obtener la referencia catastral de ese punto.
                    </p>
                </TabsContent>
            </Tabs>

            <Separator />

            {isSearching && (
                <div className="text-center p-12 border-2 border-dashed rounded-lg bg-card/50">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-lg font-medium">Consultando servicios del Catastro e IGN...</p>
                    </div>
                </div>
            )}

            {state.error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error en la búsqueda</AlertTitle>
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}

            {state.data && !isSearching && (
                <div className="space-y-6 animate-in fade-in-50 duration-500">
                    {/* 1. Datos de Localización */}
                    <Card className="border-accent/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <MapPin className="text-primary h-6 w-6"/>
                                <span>Localización Geográfica</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/30 border border-border/50">
                                    <Globe className="h-5 w-5 text-muted-foreground mb-1" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Latitud</span>
                                    <span className="text-lg font-semibold">{state.data.latitude.toFixed(6)}</span>
                                </div>
                                <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/30 border border-border/50">
                                    <Globe className="h-5 w-5 text-muted-foreground mb-1" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Longitud</span>
                                    <span className="text-lg font-semibold">{state.data.longitude.toFixed(6)}</span>
                                </div>
                                <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/30 border border-border/50">
                                    <Mountain className="h-5 w-5 text-muted-foreground mb-1" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Altitud</span>
                                    <span className="text-lg font-semibold">{state.data.altitude.toFixed(0)} m</span>
                                </div>
                            </div>
                            {state.data.ignAddress && (
                                <div className="pt-4 border-t">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 rounded-full bg-primary/10">
                                            <Navigation className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Dirección Oficial (Cartociudad IGN)</p>
                                            <p className="text-lg font-medium leading-tight">{state.data.ignAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. Información Catastral */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Building className="text-primary h-6 w-6"/>
                                <span>Información Catastral</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Referencia Catastral</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-mono font-bold text-primary">{state.data.ref}</p>
                                    <a 
                                        href={getCatastroLink(state.data.ref)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Dirección (Catastro)</p>
                                <p className="text-base font-medium">{state.data.address}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Municipio</p>
                                <p className="text-base">
                                    {state.data.municipality} 
                                    {state.data.municipalityIneCode && (
                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-mono ml-2">
                                            INE: {state.data.municipalityIneCode}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Provincia</p>
                                <p className="text-base">
                                    {state.data.province} 
                                    {state.data.ineCode && (
                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-mono ml-2">
                                            INE: {state.data.ineCode}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Código Postal</p>
                                <p className="text-base font-semibold">{state.data.postalCode || 'N/D'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Año de Construcción</p>
                                <p className="text-base font-bold text-primary">{state.data.constructionYear || 'No disponible'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Zona Climática */}
                    {state.data.climaticZone && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Thermometer className="text-primary h-6 w-6"/>
                                    <span>Zona Climática (DB-HE)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-primary/20">
                                        <span className="text-4xl font-bold">{state.data.climaticZone}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-lg font-medium text-foreground">
                                            Zona climática CTE: <span className="font-bold">{state.data.climaticZone}</span>
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="text-xs bg-background/80 border px-3 py-1.5 rounded-md flex flex-col gap-0.5">
                                                <span className="text-muted-foreground uppercase font-semibold">Provincia de cálculo</span>
                                                <span className="font-bold">{state.data.province}</span>
                                            </div>
                                            <div className="text-xs bg-background/80 border px-3 py-1.5 rounded-md flex flex-col gap-0.5">
                                                <span className="text-muted-foreground uppercase font-semibold">Altitud correspondiente</span>
                                                <span className="font-bold">{state.data.altitude.toFixed(0)} m</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-background/50 rounded-lg border border-primary/10">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        Rango de cálculo aplicado: <span className="font-bold">{state.data.climaticZoneRule}</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}