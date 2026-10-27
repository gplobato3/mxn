import { store } from '../config/store';
import { materials } from './catalog';

export interface Faq {
  q: string;
  a: string;
}

const t = store.timing;

export const faqs: Faq[] = [
  {
    q: '¿Cuánto tarda en llegar?',
    a: `Grabamos tu pieza en ${t.productionDays} después de confirmar el diseño y la enviamos con número de guía. En total la recibes en ${t.totalDays}, en cualquier parte de México.`,
  },
  {
    q: '¿Cómo sé que el nombre quedará bien escrito?',
    a: 'Lo que ves en la vista previa es lo que grabamos: respetamos mayúsculas, acentos y la ñ. Además, antes de grabar te escribimos por WhatsApp para confirmar la ortografía. Si algo no te convence, lo corregimos sin costo antes de producir.',
  },
  {
    q: `¿Qué diferencia hay entre ${materials.oro.label.toLowerCase()} y ${materials.plata950.label}?`,
    a: `El ${materials.oro.label.toLowerCase()} y el baño de plata (${'$'}${materials.oro.price}) son piezas para el día a día con un acabado brillante. La ${materials.plata950.label} (${'$'}${materials.plata950.price}) es plata sólida, no un baño: la eliges cuando quieres una joya para toda la vida.`,
  },
  {
    q: '¿Se pone negro o pierde el color?',
    a: 'Con cuidados básicos el acabado se mantiene: evita aplicar perfume directo sobre la pieza, quítatela para entrar a la alberca o al mar y guárdala seca. La plata .950, como toda plata de ley, puede oscurecerse con el tiempo y recupera su brillo con un paño para pulir.',
  },
  {
    q: '¿Qué largo de cadena me conviene?',
    a: '40 cm queda a la base del cuello, 45 cm cae justo debajo de la clavícula (es la más elegida) y 50 cm cae sobre el escote. Si es para regalo y no sabes, elige 45 cm.',
  },
  {
    q: '¿Llega listo para regalar?',
    a: store.addons.giftBox.enabled
      ? `Todas las piezas llegan protegidas. Puedes agregar el ${store.addons.giftBox.label.toLowerCase()} por ${'$'}${store.addons.giftBox.price} y una tarjeta con dedicatoria sin costo.`
      : 'Todas las piezas llegan protegidas y puedes agregar una tarjeta con dedicatoria sin costo.',
  },
  {
    q: '¿Puedo cambiarlo o devolverlo?',
    a: 'Como cada pieza se graba con el nombre que eliges, no aceptamos cambios por gusto una vez grabada. Si llega con un defecto o con un error nuestro, la reponemos sin costo. Consulta la política completa de envíos y cambios.',
  },
  {
    q: '¿Cómo puedo pagar?',
    a:
      store.payment.mode === 'endpoint'
        ? `Pagas en un entorno seguro: ${store.payment.methodsNote}.`
        : 'Al confirmar tu pedido te enviamos por WhatsApp el enlace de pago seguro. Solo grabamos tu pieza cuando el pago está confirmado.',
  },
];
