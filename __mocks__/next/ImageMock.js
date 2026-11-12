import React from 'react';

const ImageMock = (props) => {
  // eslint-disable-next-line @next/next/no-img-element -- é o mock do next/image nos testes
  return <img {...props} alt={props.alt || ''} />;
};

export default ImageMock;
