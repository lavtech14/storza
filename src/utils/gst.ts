export const calculateGST = (price: number, gst: number) => {
  const gstAmount = (price * gst) / 100;
  const finalPrice = price + gstAmount;

  return {
    gstAmount,
    finalPrice,
  };
};
