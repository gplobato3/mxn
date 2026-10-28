/**
 * Avaliações reais de clientes. Não invente avaliações nem notas: só entra aqui o que um cliente
 * mandou de verdade (Profeco e as políticas da Meta proíbem depoimentos falsos).
 *
 * Para mostrar a foto que o cliente enviou: salve como JPG em src/assets/photos/
 * (ex.: review-camila.jpg) e preencha `photo: 'review-camila'` e `photoAlt`.
 */
import type { ProductId } from './catalog';

export interface Review {
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  /** Peça que a pessoa comprou, se souber. Ordena as avaliações na página do produto. */
  product?: ProductId;
  photo?: string;
  photoAlt?: string;
}

export const reviews: Review[] = [
  // Textos copiados como os clientes escreveram (minúsculas e emojis inclusive).
  {
    author: 'Camila H',
    rating: 5,
    text: 'Qué bonito viene empacado 🥹 Abrí la cajita en cuanto llegó. El collar está súper delicado y el nombre se ve precioso.',
  },
  {
    author: 'Mariana',
    rating: 5,
    text: 'así se ve puesto 😍 Me gustó que está chiquito y combina con todo. Yo casi no uso collares, pero este sí me lo pondría diario.',
  },
  {
    author: 'vaahler',
    rating: 5,
    text: 'Les dejo foto de cerquita porque no se alcanzaba a ver bien el nombre. Está bien bonito, la verdad. Me gustó mucho cómo quedó la letra.',
  },
  {
    author: 'Daniel',
    rating: 5,
    product: 'mascota',
    text: 'miren el de mi Rocky xD todavía ni lo saco de la bolsita y ya le tomé como diez fotos jajaja. qué bonito traer su nombre conmigo.',
  },
];

export function ratingSummary(list: Review[] = reviews) {
  const count = list.length;
  const average = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { count, average: Math.round(average * 10) / 10 };
}
