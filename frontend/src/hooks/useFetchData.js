import { useState, useEffect } from "react";
import axios from "axios";

export function useFetchData(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(url);
        setData(response.data);
      } catch (err) {
        if (axios.isCancel(err)) {
          console.debug("Fetch canceled:", url);
        } else {
          console.error("Error fetching data:", err);
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, error, loading };
}