import { createContext, ReactNode, useContext, useState } from 'react';
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
          productResponse.data.amount = 1;
          const modifiedCart = [...cart, productResponse.data];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(modifiedCart));
          setCart(modifiedCart);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const modifiedCart = cart.filter(product => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(modifiedCart));
      setCart(modifiedCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stockResponse.data.amount;
      if (stockAmount >= amount) {
        cart.filter(product => product.id === productId).map(product => {
          product.amount = amount;
          setCart(current => [...current]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
          return product;
        });
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
