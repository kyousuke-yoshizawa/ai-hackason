export const useNavigate = () => {
  return (path: string) => {
    window.location.pathname = path
  }
}
