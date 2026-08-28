self.addEventListener("push", (event) => {
  let data = {
    title: "REDZONE",
    body: "Nueva notificación de REDZONE",
    url: "/",
  };

  try {
    if (event.data) {
      data = {
        ...data,
        ...event.data.json(),
      };
    }
  } catch (error) {
    console.error("Error leyendo payload push:", error);
  }

  const options = {
    body: data.body,
    icon: "/redzone_logo.png",
    badge: "/redzone_logo.png",
    data: {
      url: data.url || "/",
    },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "REDZONE", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destino = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(destino);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(destino);
      }
    })
  );
});
