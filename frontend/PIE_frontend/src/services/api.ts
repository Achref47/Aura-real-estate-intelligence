import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000"
});

export const predictProperty = async (data: any) => {
  const response = await API.post("/predict", data);
  return response.data;
};

export default API;