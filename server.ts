import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint for AI Procurement & Sizing Planning
app.post('/api/ai/procurement-analysis', async (req: Request, res: Response) => {
  try {
    const {
      permanentCount,
      seasonalRegistered,
      seasonalProjected,
      bufferPercent,
      targetDeliveryDate,
      leadTimeDays,
      categorySummaries,
      notes,
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Graceful fallback with standard mathematical procurement recommendation
      const totalProjectedSeasonal = (seasonalRegistered || 0) + (seasonalProjected || 0);
      const recommendedBuffer = Math.round(totalProjectedSeasonal * ((bufferPercent || 15) / 100));
      return res.json({
        success: true,
        source: 'heuristic',
        analysis: {
          executiveSummary: `Planificación de temporada estival calculada para ${totalProjectedSeasonal} trabajadores temporales y ${permanentCount || 0} de planta permanente. Se recomienda emitir las órdenes de compra con al menos ${leadTimeDays || 45} días de antelación para asegurar confección y bordado.`,
          bufferRecommendation: `Se aconseja una holgura del ${bufferPercent || 15}% (+${recommendedBuffer} unidades) concentrada en tallas intermedias (M, L para prendas superiores; 42, 44 para pantalones; 41, 42 para calzado), debido a la alta rotación y contrataciones de última hora en temporada alta.`,
          keyTimelineMilestones: [
            { milestone: 'Cierre de recolección de tallas', target: '45 días antes de temporada', risk: 'Bajo' },
            { milestone: 'Emisión de Orden de Compra a proveedores textiles', target: '40 días antes de temporada', risk: 'Crítico' },
            { milestone: 'Recepción y control de calidad en bodega central', target: '10 días antes de temporada', risk: 'Medio' },
            { milestone: 'Distribución y entrega masiva a cuadrillas', target: 'Fecha objetivo de inicio', risk: 'Crítico' },
          ],
          fabricSpecsNotice: 'Para la dotación estival, exigir telas con protección UV UPF 50+, tratamiento anti-desgarro ripstop transpirable y costuras reforzadas.',
        },
      });
    }

    const prompt = `
Eres un experto senior en Cadena de Suministro, Adquisiciones y Gestión de EPP/Uniformes Corporativos para empresas con dotación permanente y dotación masiva de temporada estival (agrícola, logística, retail o industrial).

Genera un informe estratégico y oportuno de compras en base a estos datos de la empresa:
- Planta Permanente activa: ${permanentCount} trabajadores
- Temporada Estival registrada actualmente: ${seasonalRegistered} trabajadores
- Temporada Estival adicional proyectada (por ingresar): ${seasonalProjected} trabajadores
- Margen de seguridad (buffer) configurado: ${bufferPercent}%
- Días promedio de confección y despacho de proveedores (Lead Time): ${leadTimeDays} días
- Fecha objetivo de inicio de temporada y entrega: ${targetDeliveryDate || 'Próximo ciclo estival'}
- Resumen de prendas y tallas analizadas: ${JSON.stringify(categorySummaries || [])}
- Contexto operacional adicional: ${notes || 'Operación en terreno con alta exposición solar y faenas físicas continuas.'}

Responde estrictamente en formato JSON válido con la siguiente estructura:
{
  "executiveSummary": "string conciso con el diagnóstico de compras",
  "bufferRecommendation": "análisis de contingencia para temporeros y curva de tallas recomendada",
  "procurementActionPlan": [
    {
      "step": "string con la acción clave",
      "timeframe": "string con el plazo oportuno respecto al inicio de temporada",
      "impact": "Alto / Medio / Crítico",
      "details": "descripción táctica para adquisiciones"
    }
  ],
  "supplierNegotiationTips": [
    "punto 1 para negociar precios por volumen o reposición ágil",
    "punto 2 sobre acuerdos de cambio de talla con proveedor"
  ],
  "technicalSpecsRecommendation": "recomendaciones técnicas para uniforme estival vs permanente (UV, respirabilidad, durabilidad)",
  "potentialRisks": [
    "riesgo de quiebre de stock en tallas críticas",
    "riesgo de atraso de importación o taller textil"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      source: 'gemini',
      analysis: parsed,
    });
  } catch (error: any) {
    console.error('Error in procurement AI analysis:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al procesar el análisis de compras',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
