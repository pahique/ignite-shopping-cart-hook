import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
       return JSON.parse(storagedCart);
    }
    return [];
  });

  const prevCartRef = useRef<Product[]>();
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    prevCartRef.current = cart;
  });

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if (product) {
        updateProductAmount({productId, amount: product.amount + 1});
      } else {
        const stockResponse = await api.get<Stock>(`/stock/${productId}`);
        const stockAmount = stockResponse.data.amount;
        if (stockAmount >= 1) {
          const productResponse = await api.get<Product>(`/products/${productId}`);
          const newProduct = {
            ...productResponse.data,
            amount: 1,
          }
          const modifiedCart = [...cart, newProduct];
          setCart(modifiedCart);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na adi????o do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if (!product) {
        throw new Error("Produto inexistente");
      }
      const modifiedCart = cart.filter(product => product.id !== productId);
      setCart(modifiedCart);
    } catch {
      toast.error("Erro na remo????o do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount > 0) {
      try {
        const updatedCart = [...cart];
        const product = updatedCart.find(product => product.id === productId);
        if (!product) {
          throw new Error("Produto inexistente");
        }
        const stockResponse = await api.get<Stock>(`/stock/${productId}`);
        const stockAmount = stockResponse.data.amount;
        if (stockAmount >= amount) {
          product.amount = amount;
          setCart(updatedCart);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      } catch {
        toast.error("Erro na altera????o de quantidade do produto");
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
