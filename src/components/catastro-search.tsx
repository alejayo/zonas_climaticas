'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { searchCatastro, searchByCoords } from '@/app/actions';
import type { ActionState, CEEItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Search, MapPin, Globe, Mountain, 
    AlertTriangle, Building, Thermometer, Map as MapIcon, 
    Navigation, CheckCircle2, ExternalLink, Info, FileText,
    Zap, ClipboardCheck, History, Calendar
} from 'lucide-react';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

const initialState: ActionState = { data: null, error: null };

const CEE_COLORES: Record<string, string> = {
  A: "bg-[#00a550]",
  B: "bg-[#51b747]",
  C: "bg-[#bcd630]",
  D: "bg-[#fff200]",
  E: "bg-[#ffb612]",
  F: "bg-[#f06c23]",
  G: "bg-[#ed1c24]",
};

const LetraBadge = ({ letra, size = 'md' }: { letra: string, size?: 'sm' | 'md' }) => {
  if (!letra || letra === '—' || letra === '') return <Badge variant="outline">—</Badge>;
  const l = letra.toUpperCase();
  const colorClass = CEE_COLORES[l] || "bg-muted";
  const textColor = ["D", "E"].includes(l) ? "text-black" : "text-white";
  
  return (
    <span className={cn(
      "inline-flex items-center justify-center font-black rounded shadow-sm transition-transform hover:scale-105",
      colorClass,
      textColor,
      size === 'sm' ? "w-6 h-6 text-[10px]" : "w-10 h-10 text-xl"
    )}>
      {l}
    </span>
  );
};

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
            setAddressQuery(state.data.address); 
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
            setAddressQuery(newState.data.address);
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

    const getCatastroLink = (rc: string) => {
        if (!rc || rc.length < 14) return '#';
        const rc1 = rc.substring(0, 7);
        const rc2 = rc.substring(7, 14);
        if (rc.length >= 20) {
            const car = rc.substring(14, 18);
            const cc1 = rc.substring(18, 19);
            const cc2 = rc.substring(19, 20);
            return `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc1=${rc1}&rc2=${rc2}&car=${car}&cc1=${cc1}&cc2=${cc2}`;
        }
        return `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc1=${rc1}&rc2=${rc2}`;
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
                            <input type="hidden" name="ref" value={rcValue} />
                            <Input 
                                value={rcValue}
                                onChange={(e) => setRcValue(e.target.value)}
                                placeholder="Ej: 9872023VH5797S..." 
                                className="flex-grow text-lg h-12 uppercase font-mono" 
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
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Thermometer className="text-primary h-6 w-6"/>
                                <span>Zona Climática (DB-HE)</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-md">
                                            <span className="text-2xl font-bold">{state.data.climaticZone || 'N/D'}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold uppercase text-muted-foreground">Zona General CTE</p>
                                            <p className="text-xs text-muted-foreground italic">{state.data.climaticZoneRule}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Provincia de cálculo</p>
                                        <p className="text-sm font-bold">{state.data.province}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Altitud aplicada</p>
                                        <p className="text-sm font-bold">{state.data.altitude.toFixed(0)} m</p>
                                    </div>
                                </div>

                                {state.data.alternativeClimaticZone && (
                                    <div className="bg-background/60 p-4 rounded-lg border-2 border-primary/30 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2">
                                            <Info className="h-4 w-4 text-primary opacity-50" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground font-black text-xl shadow-inner">
                                                    {state.data.alternativeClimaticZone}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-primary uppercase leading-tight">Zona Alternativa</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Doc. Reconocido CTE</p>
                                                </div>
                                            </div>
                                            <Separator className="bg-primary/10" />
                                            <div>
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Municipio aplicado:</p>
                                                <p className="text-sm font-bold text-foreground">{state.data.alternativeClimaticZoneMunicipality}</p>
                                            </div>
                                            {state.data.alternativeClimaticZoneReference && (
                                                <div className="pt-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Registro CTE:</span>
                                                        <span className="text-[11px] font-mono font-bold text-primary">{state.data.alternativeClimaticZoneReference}</span>
                                                    </div>
                                                    <a 
                                                        href="https://www.codigotecnico.org/RegistroCTE/DocumentosReconocidos.html"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Ver Documentos Reconocidos <ExternalLink className="h-2 w-2" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Comunitat Valenciana - IEE / CEE Detallado */}
                    {(state.data.ieeGva || state.data.ceeGva) && (
                      <Card className="border-green-600/20 bg-green-50/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl text-green-800">
                            <ClipboardCheck className="h-6 w-6"/>
                            <span>Registros GVA (Comunitat Valenciana)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* IEE SECTION */}
                          {state.data.ieeGva && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold flex items-center gap-2 text-green-700">
                                <FileText className="h-4 w-4" /> INFORME EVALUACIÓN EDIFICIO (IEE)
                              </h4>
                              {state.data.ieeGva.found ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-white border border-green-200">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Estado</p>
                                    <div className="flex items-center gap-2">
                                      <Badge className={state.data.ieeGva.evaluado === 'Completo' ? 'bg-green-600' : 'bg-orange-500'}>
                                        {state.data.ieeGva.evaluado}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Validez</p>
                                    <p className="text-sm font-medium flex items-center gap-1">
                                      <Calendar className="h-3 w-3" /> Hasta: {state.data.ieeGva.caducidad}
                                    </p>
                                  </div>
                                  
                                  {/* Emisiones, Consumo e Intervenciones IEE */}
                                  <div className="col-span-full pt-2 border-t space-y-3">
                                    {(state.data.ieeGva.emisiones || state.data.ieeGva.consumo) && (
                                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        {state.data.ieeGva.emisiones && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Emisiones IEE:</span>
                                            <LetraBadge letra={state.data.ieeGva.emisiones} size="sm" />
                                          </div>
                                        )}
                                        {state.data.ieeGva.consumo && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Consumo IEE:</span>
                                            <LetraBadge letra={state.data.ieeGva.consumo} size="sm" />
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {(state.data.ieeGva.count_intu! > 0 || state.data.ieeGva.count_intm! > 0) && (
                                      <div className="flex flex-col gap-1 mt-1 border-t pt-2">
                                        {state.data.ieeGva.count_intu! > 0 && (
                                          <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> {state.data.ieeGva.count_intu} intervenciones urgentes
                                          </p>
                                        )}
                                        {state.data.ieeGva.count_intm! > 0 && (
                                          <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                                            <Zap className="h-3 w-3" /> {state.data.ieeGva.count_intm} intervenciones a corto plazo
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {state.data.ieeGva.urlgesie && (
                                    <div className="col-span-full pt-2">
                                      <Button variant="outline" size="sm" asChild className="w-full text-xs h-8">
                                        <a href={state.data.ieeGva.urlgesie} target="_blank" rel="noopener noreferrer">
                                          Ver Informe GESIEE <ExternalLink className="h-3 w-3 ml-1" />
                                        </a>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Alert className="bg-white border-red-200">
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                  <AlertDescription className="text-sm text-red-700 font-medium">No se ha encontrado IEE registrado para este edificio.</AlertDescription>
                                </Alert>
                              )}
                            </div>
                          )}

                          {/* CEE SECTION */}
                          {state.data.ceeGva && (
                            <div className="space-y-3 pt-2">
                              <h4 className="text-sm font-bold flex items-center gap-2 text-green-700">
                                <Zap className="h-4 w-4" /> CERTIFICADO EFICIENCIA ENERGÉTICA (CEE)
                              </h4>
                              {state.data.ceeGva.found ? (
                                <div className="space-y-4">
                                  {state.data.ceeGva.exactMatch ? (
                                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 shadow-sm">
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Certificado Inmueble Exacto</p>
                                        <Badge variant="outline" className="bg-white border-blue-200 text-blue-800 text-[10px] font-mono font-bold">
                                          {state.data.ceeGva.exactMatch.ref}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex gap-6">
                                          <div className="text-center">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Emisiones</p>
                                            <div className="flex items-center gap-2">
                                              <LetraBadge letra={state.data.ceeGva.exactMatch.emicalif} />
                                              <span className="text-xs font-bold text-blue-900">{state.data.ceeGva.exactMatch.emitotal} kgCO₂</span>
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Consumo</p>
                                            <div className="flex items-center gap-2">
                                              <LetraBadge letra={state.data.ceeGva.exactMatch.concalif} />
                                              <span className="text-xs font-bold text-blue-900">{state.data.ceeGva.exactMatch.contotal} kWh</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right flex-grow">
                                          <p className="text-[11px] font-bold text-blue-900 mb-1">
                                            Vence: {state.data.ceeGva.exactMatch.validohasta}
                                          </p>
                                          {state.data.ceeGva.exactMatch.url && (
                                            <a href={state.data.ceeGva.exactMatch.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-primary hover:underline flex items-center justify-end gap-1">
                                              Descargar PDF <ExternalLink className="h-3 w-3" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic bg-white p-3 rounded-md border">No hay un certificado específico para este inmueble concreto.</p>
                                  )}

                                  {state.data.ceeGva.others && state.data.ceeGva.others.length > 0 && (
                                    <Accordion type="single" collapsible className="w-full mt-4">
                                      <AccordionItem value="others-table" className="border-none">
                                        <AccordionTrigger className="hover:no-underline py-2 group">
                                          <div className="flex items-center gap-2 text-[11px] font-bold text-green-800 uppercase tracking-wide">
                                            <Building className="h-4 w-4" />
                                            Otros certificados del edificio ({state.data.ceeGva.others.length})
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2">
                                          <div className="overflow-x-auto rounded-md border border-slate-200 shadow-inner">
                                            <table className="w-full text-[11px] border-collapse">
                                              <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                  <th className="px-4 py-2 text-left font-bold text-slate-600">Ref. catastral</th>
                                                  <th className="px-4 py-2 text-left font-bold text-slate-600">Emisiones</th>
                                                  <th className="px-4 py-2 text-left font-bold text-slate-600">Consumo</th>
                                                  <th className="px-4 py-2 text-left font-bold text-slate-600">Válido hasta</th>
                                                  <th className="px-4 py-2 w-10"></th>
                                                </tr>
                                              </thead>
                                              <tbody className="bg-white divide-y divide-slate-100">
                                                {state.data.ceeGva.others.map((item, idx) => (
                                                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.ref}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                      <div className="flex items-center gap-2">
                                                        <LetraBadge letra={item.emicalif} size="sm" />
                                                        <span className="font-bold text-slate-700">{item.emitotal} kgCO₂</span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                      <div className="flex items-center gap-2">
                                                        <LetraBadge letra={item.concalif} size="sm" />
                                                        <span className="font-bold text-slate-700">{item.contotal} kWh</span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 font-medium">{item.validohasta}</td>
                                                    <td className="px-4 py-3 text-right">
                                                      {item.url && (
                                                        <a 
                                                          href={item.url} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer" 
                                                          className="text-primary hover:text-primary/80"
                                                        >
                                                          <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  )}
                                </div>
                              ) : (
                                <Alert className="bg-white border-red-200">
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                  <AlertDescription className="text-sm text-red-700 font-medium">No hay certificados registrados para esta finca.</AlertDescription>
                                </Alert>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* 5. Otros Registros Regionales */}
                    {state.data.ceeRegistry && (
                        <Card className="border-orange-500/20 bg-orange-50/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    < Zap className="text-orange-600 h-6 w-6"/>
                                    <span>Otros Enlaces de Interés</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-orange-800">{state.data.ceeRegistry.name}</p>
                                        <p className="text-xs text-muted-foreground">{state.data.ceeRegistry.description}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button asChild variant="outline" size="sm" className="bg-white hover:bg-orange-100 border-orange-200">
                                            <a href={state.data.ceeRegistry.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                                                <Search className="h-4 w-4" /> Buscar en Registro
                                            </a>
                                        </Button>
                                        {state.data.ceeRegistry.visorUrl && (
                                            <Button asChild variant="default" size="sm" className="bg-orange-600 hover:bg-orange-700">
                                                <a href={state.data.ceeRegistry.visorUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                                                    <MapIcon className="h-4 w-4" /> Ver en Visor Público
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <Alert className="bg-blue-50 border-blue-200 text-blue-800 py-3">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-xs">
                                        Los registros de CEE son gestionados de forma independiente por cada Comunidad Autónoma. Haz clic en los botones superiores para verificar si este inmueble tiene un certificado vigente.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
