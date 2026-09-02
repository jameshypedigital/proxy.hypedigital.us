export default function BridgePage() {
  return null;
}

export async function getServerSideProps(context) {
  const { lpurl } = context.query;

  if (!lpurl) {
    return {
      notFound: true
    };
  }

  return {
    redirect: {
      destination: lpurl,
      permanent: false
    }
  };
}
