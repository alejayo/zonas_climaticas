export const provinceIneCodes = new Map<string, string>([
    ['ALAVA', '01'], ['ARABA', '01'],
    ['ALBACETE', '02'],
    ['ALICANTE', '03'], ['ALACANT', '03'],
    ['ALMERIA', '04'],
    ['AVILA', '05'],
    ['BADAJOZ', '06'],
    ['ISLAS BALEARES', '07'], ['ILLES BALEARS', '07'], ['BALEARS, ILLES', '07'],
    ['BARCELONA', '08'],
    ['BURGOS', '09'],
    ['CACERES', '10'],
    ['CADIZ', '11'],
    ['CASTELLON', '12'], ['CASTELLO', '12'],
    ['CIUDAD REAL', '13'],
    ['CORDOBA', '14'],
    ['LA CORUNA', '15'], ['A CORUNA', '15'], ['CORUNA, A', '15'],
    ['CUENCA', '16'],
    ['GERONA', '17'], ['GIRONA', '17'],
    ['GRANADA', '18'],
    ['GUADALAJARA', '19'],
    ['GUIPUZCOA', '20'], ['GIPUZKOA', '20'],
    ['HUELVA', '21'],
    ['HUESCA', '22'],
    ['JAEN', '23'],
    ['LEON', '24'],
    ['LERIDA', '25'], ['LLEIDA', '25'],
    ['LA RIOJA', '26'], ['RIOJA, LA', '26'],
    ['LUGO', '27'],
    ['MADRID', '28'],
    ['MALAGA', '29'],
    ['MURCIA', '30'],
    ['NAVARRA', '31'],
    ['ORENSE', '32'], ['OURENSE', '32'],
    ['ASTURIAS', '33'],
    ['PALENCIA', '34'],
    ['LAS PALMAS', '35'], ['PALMAS, LAS', '35'],
    ['PONTEVEDRA', '36'],
    ['SALAMANCA', '37'],
    ['SANTA CRUZ DE TENERIFE', '38'], ['S.C. TENERIFE', '38'],
    ['CANTABRIA', '39'],
    ['SEGOVIA', '40'],
    ['SEVILLA', '41'],
    ['SORIA', '42'],
    ['TARRAGONA', '43'],
    ['TERUEL', '44'],
    ['TOLEDO', '45'],
    ['VALENCIA', '46'], ['VALÈNCIA', '46'],
    ['VALLADOLID', '47'],
    ['VIZCAYA', '48'], ['BIZKAIA', '48'],
    ['ZAMORA', '49'],
    ['ZARAGOZA', '50'],
    ['CEUTA', '51'],
    ['MELILLA', '52'],
]);

export function getIneCode(provinceName: string): string | null {
    if (!provinceName) return null;
    const normalized = provinceName.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return provinceIneCodes.get(normalized) || null;
}

type ClimaticZoneRule = {
    max?: number;
    min?: number;
    zone: string;
};

const climaticZones = new Map<string, ClimaticZoneRule[]>([
    ['ALBACETE', [{max: 450, zone: 'C3'}, {max: 950, zone: 'D3'}, {min: 951, zone: 'E1'}]],
    ['ALICANTE', [{max: 250, zone: 'B4'}, {max: 700, zone: 'C3'}, {min: 701, zone: 'D3'}]],
    ['ALMERIA', [{max: 100, zone: 'A4'}, {max: 250, zone: 'B4'}, {max: 400, zone: 'B3'}, {max: 800, zone: 'C3'}, {min: 801, zone: 'D3'}]],
    ['ALAVA', [{max: 600, zone: 'D1'}, {min: 601, zone: 'E1'}]],
    ['ASTURIAS', [{max: 50, zone: 'C1'}, {max: 550, zone: 'D1'}, {min: 551, zone: 'E1'}]],
    ['AVILA', [{max: 550, zone: 'D2'}, {max: 850, zone: 'D1'}, {min: 851, zone: 'E1'}]],
    ['BADAJOZ', [{max: 400, zone: 'C4'}, {max: 450, zone: 'C3'}, {min: 451, zone: 'D3'}]],
    ['ISLAS BALEARES', [{max: 250, zone: 'B3'}, {min: 251, zone: 'C3'}]],
    ['BARCELONA', [{max: 250, zone: 'C2'}, {max: 450, zone: 'D2'}, {max: 750, zone: 'D1'}, {min: 751, zone: 'E1'}]],
    ['VIZCAYA', [{max: 250, zone: 'C1'}, {min: 251, zone: 'D1'}]],
    ['BURGOS', [{max: 600, zone: 'D1'}, {min: 601, zone: 'E1'}]],
    ['CACERES', [{max: 600, zone: 'C4'}, {max: 1050, zone: 'D3'}, {min: 1051, zone: 'E1'}]],
    ['CADIZ', [{max: 150, zone: 'A3'}, {max: 450, zone: 'B3'}, {max: 600, zone: 'C3'}, {max: 850, zone: 'C2'}, {min: 851, zone: 'D2'}]],
    ['CANTABRIA', [{max: 150, zone: 'C1'}, {max: 650, zone: 'D1'}, {min: 651, zone: 'E1'}]],
    ['CASTELLON', [{max: 100, zone: 'B3'}, {max: 500, zone: 'C3'}, {max: 600, zone: 'D3'}, {max: 1000, zone: 'D2'}, {min: 1001, zone: 'E1'}]],
    ['CEUTA', [{zone: 'B3'}]],
    ['CIUDAD REAL', [{max: 450, zone: 'C4'}, {max: 500, zone: 'C3'}, {min: 501, zone: 'D3'}]],
    ['CORDOBA', [{max: 150, zone: 'B4'}, {max: 550, zone: 'C4'}, {min: 551, zone: 'D3'}]],
    ['LA CORUNA', [{max: 200, zone: 'C1'}, {min: 201, zone: 'D1'}]],
    ['CUENCA', [{max: 800, zone: 'D3'}, {max: 1050, zone: 'D2'}, {min: 1051, zone: 'E1'}]],
    ['GUIPUZCOA', [{max: 400, zone: 'D1'}, {min: 401, zone: 'E1'}]],
    ['GERONA', [{max: 100, zone: 'C2'}, {max: 600, zone: 'D2'}, {min: 601, zone: 'E1'}]],
    ['GRANADA', [{max: 50, zone: 'A4'}, {max: 350, zone: 'B4'}, {max: 600, zone: 'C4'}, {max: 800, zone: 'C3'}, {max: 1300, zone: 'D3'}, {min: 1301, zone: 'E1'}]],
    ['GUADALAJARA', [{max: 950, zone: 'D3'}, {max: 1000, zone: 'D2'}, {min: 1001, zone: 'E1'}]],
    ['HUELVA', [{max: 50, zone: 'A4'}, {max: 150, zone: 'B4'}, {max: 350, zone: 'B3'}, {max: 800, zone: 'C3'}, {min: 801, zone: 'D3'}]],
    ['HUESCA', [{max: 200, zone: 'C3'}, {max: 400, zone: 'D3'}, {max: 700, zone: 'D2'}, {min: 701, zone: 'E1'}]],
    ['JAEN', [{max: 350, zone: 'B4'}, {max: 750, zone: 'C4'}, {max: 1250, zone: 'D3'}, {min: 1251, zone: 'E1'}]],
    ['LEON', [{zone: 'E1'}]],
    ['LERIDA', [{max: 100, zone: 'C3'}, {max: 600, zone: 'D3'}, {min: 601, zone: 'E1'}]],
    ['LUGO', [{max: 500, zone: 'D1'}, {min: 501, zone: 'E1'}]],
    ['MADRID', [{max: 500, zone: 'C3'}, {max: 950, zone: 'D3'}, {max: 1000, zone: 'D2'}, {min: 1001, zone: 'E1'}]],
    ['MALAGA', [{max: 100, zone: 'A3'}, {max: 300, zone: 'B3'}, {max: 700, zone: 'C3'}, {min: 701, zone: 'D3'}]],
    ['MELILLA', [{zone: 'A3'}]],
    ['MURCIA', [{max: 100, zone: 'B3'}, {max: 550, zone: 'C3'}, {min: 551, zone: 'D3'}]],
    ['NAVARRA', [{max: 100, zone: 'C2'}, {max: 350, zone: 'D2'}, {max: 600, zone: 'D1'}, {min: 601, zone: 'E1'}]],
    ['ORENSE', [{max: 150, zone: 'C3'}, {max: 300, zone: 'C2'}, {max: 800, zone: 'D2'}, {min: 801, zone: 'E1'}]],
    ['PALENCIA', [{max: 800, zone: 'D1'}, {min: 801, zone: 'E1'}]],
    ['LAS PALMAS', [{max: 350, zone: 'α3'}, {max: 750, zone: 'A2'}, {max: 1000, zone: 'B2'}, {min: 1001, zone: 'C2'}]],
    ['PONTEVEDRA', [{max: 350, zone: 'C1'}, {min: 351, zone: 'D1'}]],
    ['LA RIOJA', [{max: 200, zone: 'C2'}, {max: 700, zone: 'D2'}, {min: 701, zone: 'E1'}]],
    ['SALAMANCA', [{max: 850, zone: 'D2'}, {min: 851, zone: 'E1'}]],
    ['SANTA CRUZ DE TENERIFE', [{max: 350, zone: 'α3'}, {max: 750, zone: 'A2'}, {max: 1000, zone: 'B2'}, {min: 1001, zone: 'C2'}]],
    ['SEGOVIA', [{max: 1050, zone: 'D2'}, {min: 1051, zone: 'E1'}]],
    ['SEVILLA', [{max: 200, zone: 'B4'}, {min: 201, zone: 'C4'}]],
    ['SORIA', [{max: 750, zone: 'D2'}, {max: 800, zone: 'D1'}, {min: 801, zone: 'E1'}]],
    ['TARRAGONA', [{max: 100, zone: 'B3'}, {max: 500, zone: 'C3'}, {min: 501, zone: 'D3'}]],
    ['TERUEL', [{max: 450, zone: 'C3'}, {max: 500, zone: 'C2'}, {max: 1000, zone: 'D2'}, {min: 1001, zone: 'E1'}]],
    ['TOLEDO', [{max: 500, zone: 'C4'}, {min: 501, zone: 'D3'}]],
    ['VALENCIA', [{max: 50, zone: 'B3'}, {max: 500, zone: 'C3'}, {max: 950, zone: 'D2'}, {min: 951, zone: 'E1'}]],
    ['VALLADOLID', [{max: 800, zone: 'D2'}, {min: 801, zone: 'E1'}]],
    ['ZAMORA', [{max: 800, zone: 'D2'}, {min: 801, zone: 'E1'}]],
    ['ZARAGOZA', [{max: 200, zone: 'C3'}, {max: 650, zone: 'D3'}, {min: 651, zone: 'E1'}]],
]);

const climateProvinceMap = new Map<string, string>([
    ['ARABA', 'ALAVA'],
    ['ALACANT', 'ALICANTE'],
    ['ILLES BALEARS', 'ISLAS BALEARES'], ['BALEARS, ILLES', 'ISLAS BALEARES'],
    ['BIZKAIA', 'VIZCAYA'],
    ['CASTELLO', 'CASTELLON'],
    ['A CORUNA', 'LA CORUNA'], ['CORUNA, A', 'LA CORUNA'],
    ['GIPUZKOA', 'GUIPUZCOA'],
    ['GIRONA', 'GERONA'],
    ['LLEIDA', 'LERIDA'],
    ['RIOJA, LA', 'LA RIOJA'],
    ['OURENSE', 'ORENSE'],
    ['PALMAS, LAS', 'LAS PALMAS'],
    ['S.C. TENERIFE', 'SANTA CRUZ DE TENERIFE'],
    ['VALÈNCIA', 'VALENCIA'],
]);

export function getClimaticZone(provinceName: string, altitude: number): { zone: string; rule: string } | null {
    if (!provinceName) return null;
    let normalized = provinceName.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    normalized = climateProvinceMap.get(normalized) || normalized;

    const rules = climaticZones.get(normalized);
    if (!rules) return null;

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];

        // For single-zone provinces
        if (rule.max === undefined && rule.min === undefined) {
            return { zone: rule.zone, rule: 'Provincia con zona única' };
        }
        
        // For upper-bound rules (<=)
        if (rule.max !== undefined && altitude <= rule.max) {
            const lowerBound = i > 0 ? (rules[i - 1].max || 0) : 0;
            if (lowerBound > 0) {
                 return { zone: rule.zone, rule: `${lowerBound}m < Altitud <= ${rule.max}m` };
            } else {
                 return { zone: rule.zone, rule: `Altitud <= ${rule.max}m` };
            }
        }

        // For lower-bound rules (>=)
        if (rule.min !== undefined && rule.max === undefined && altitude >= rule.min) {
            return { zone: rule.zone, rule: `Altitud >= ${rule.min}m` };
        }
    }
    
    return null;
}
