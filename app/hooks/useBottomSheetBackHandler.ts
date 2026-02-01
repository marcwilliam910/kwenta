import {useCallback, useEffect, useState} from "react";
import {BackHandler} from "react-native";

export default function useBottomSheetBackHandler(sheetRef: any) {
  const [sheetIndex, setSheetIndex] = useState(-1);

  const handleBackPress = useCallback(() => {
    if (sheetIndex >= 0) {
      sheetRef.current?.close();
      return true;
    }
    return false;
  }, [sheetIndex, sheetRef]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => subscription.remove();
  }, [handleBackPress]);

  // only return setSheetIndex for wiring to onChange
  return setSheetIndex;
}
